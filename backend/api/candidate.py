import hashlib
import secrets
import string
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException
from sqlalchemy import delete, func, select

from backend.schemas.candidate import (
    CandidateResponse, CreateCandidate, CandidateUpdate, LoginCandidate,
    PasswordResetConfirm, PasswordResetRequest,
)
from backend.models.candidate import Candidate
from backend.models.password_reset_code import PasswordResetCode
from backend.database import sessionLocal
from backend.services.auth import hash_password, verify_password
from backend.services.otp_delivery import deliver_reset_code, reset_delivery_configured

router = APIRouter()


def normalize_phone(value: str | None) -> str | None:
    if not value or not value.strip():
        return None
    value = value.strip()
    if value.count("+") > 1 or ("+" in value and not value.startswith("+")) or any(
        not (character.isdigit() or character in "+ -()") for character in value
    ):
        raise HTTPException(status_code=422, detail="Enter a valid 10-digit Indian mobile number, with or without +91")
    digits = "".join(character for character in value if character.isdigit())
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    if len(digits) != 10 or digits[0] not in "6789":
        raise HTTPException(status_code=422, detail="Enter a valid 10-digit Indian mobile number, with or without +91")
    return "+91" + digits


def hash_reset_code(code: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", code.encode(), salt.encode(), 150_000).hex()


@router.post("/candidates", response_model=CandidateResponse)
def create_candidate(candidate: CreateCandidate):
    session = sessionLocal()
    try:
        email = candidate.email.strip().lower()
        phone_number = normalize_phone(candidate.phone_number)
        if session.execute(select(Candidate).where(func.lower(Candidate.email) == email)).scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Email is already registered")
        if phone_number and session.execute(select(Candidate).where(Candidate.phone_number == phone_number)).scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Phone number is already registered")
        db_candidate = Candidate(
            name=candidate.name.strip(), email=email, phone_number=phone_number,
            password=hash_password(candidate.password),
        )
        session.add(db_candidate)
        session.commit()
        session.refresh(db_candidate)
        return db_candidate
    finally:
        session.close()

@router.post("/candidates/login")
def login(credentials: LoginCandidate):
    session = sessionLocal()
    try:
        identifier = credentials.email.strip()
        if "@" in identifier:
            statement = select(Candidate).where(func.lower(Candidate.email) == identifier.lower())
        else:
            phone_number = normalize_phone(identifier)
            statement = select(Candidate).where(Candidate.phone_number == phone_number)
        result = session.execute(statement)
        candidate = result.scalar_one_or_none()

        if candidate is None:
            raise HTTPException(status_code=404, detail="Account not found")

        verification = verify_password(credentials.password, candidate.password)

        if verification:
            return {"candidate_id": candidate.id, "name": candidate.name}
        else:
            raise HTTPException(status_code=401, detail="Email or password is incorrect")

    finally:
        session.close()

@router.get("/candidates", response_model=list[CandidateResponse])
def get_candidates():
    session = sessionLocal()
    statement = select(Candidate)
    result = session.execute(statement)
    candidates = result.scalars().all()

    session.close()

    return candidates

@router.get("/candidates/{id}", response_model=CandidateResponse)
def single_candidate_return(id: int):
    session = sessionLocal()
    try:
        statement = select(Candidate).where(Candidate.id == id)
        result = session.execute(statement)
        candidate = result.scalar_one_or_none()

        if candidate is None:
            raise HTTPException(
                status_code=404,
                detail="Candidate not found"
            )

        return candidate

    finally:
        session.close()

@router.put("/candidates/{id}", response_model= CandidateResponse)
def update_candidate(id:int, candidate_update: CandidateUpdate):
    session = sessionLocal()
    try:
        statement = select(Candidate).where(Candidate.id == id)
        result = session.execute(statement)
        candidate = result.scalar_one_or_none()

        if candidate is None:
            raise HTTPException(status_code= 404, detail= "Candidate not found")

        email = candidate_update.email.strip().lower()
        phone_number = normalize_phone(candidate_update.phone_number) if "phone_number" in candidate_update.model_fields_set else candidate.phone_number
        duplicate_email = session.execute(select(Candidate).where(func.lower(Candidate.email) == email, Candidate.id != id)).scalar_one_or_none()
        duplicate_phone = session.execute(select(Candidate).where(Candidate.phone_number == phone_number, Candidate.id != id)).scalar_one_or_none() if phone_number else None
        if duplicate_email:
            raise HTTPException(status_code=409, detail="Email is already registered")
        if duplicate_phone:
            raise HTTPException(status_code=409, detail="Phone number is already registered")

        candidate.name = candidate_update.name.strip()
        candidate.email = email
        candidate.phone_number = phone_number

        session.commit()
        session.refresh(candidate)

        return candidate

    finally:
        session.close()


@router.post("/candidates/password-reset/request")
def request_password_reset(request: PasswordResetRequest):
    identifier = request.identifier.strip()
    is_email = "@" in identifier
    destination = identifier.lower() if is_email else normalize_phone(identifier)
    if not destination or (is_email and (identifier.startswith("@") or identifier.endswith("@"))):
        raise HTTPException(status_code=422, detail="Enter a valid email address or phone number")
    if not reset_delivery_configured(is_email):
        channel = "Email" if is_email else "SMS"
        raise HTTPException(status_code=503, detail=f"{channel} password recovery is not configured yet")
    session = sessionLocal()
    try:
        lookup = select(Candidate).where(
            func.lower(Candidate.email) == destination if is_email else Candidate.phone_number == destination
        )
        candidate = session.execute(lookup).scalar_one_or_none()
        if candidate is None:
            return {"message": "If the account exists, a verification code has been sent."}

        now = datetime.now()
        session.execute(
            delete(PasswordResetCode).where(
                PasswordResetCode.candidate_id == candidate.id,
                PasswordResetCode.created_at < now - timedelta(minutes=15),
            )
        )
        recent_codes = session.execute(
            select(PasswordResetCode).where(
                PasswordResetCode.candidate_id == candidate.id,
                PasswordResetCode.created_at >= now - timedelta(minutes=15),
            )
        ).scalars().all()
        if len(recent_codes) >= 3:
            raise HTTPException(status_code=429, detail="Too many requests. Try again in 15 minutes.")

        code = "".join(secrets.choice(string.digits) for _ in range(6))
        salt = secrets.token_hex(16)
        reset_code = PasswordResetCode(
            candidate_id=candidate.id,
            code_hash=hash_reset_code(code, salt),
            code_salt=salt,
            created_at=now,
            expires_at=now + timedelta(minutes=10),
        )
        session.add(reset_code)
        session.flush()
        try:
            deliver_reset_code(destination, code, is_email)
        except RuntimeError as error:
            session.rollback()
            raise HTTPException(status_code=503, detail=str(error)) from error
        session.commit()
        return {"message": "If the account exists, a verification code has been sent."}
    finally:
        session.close()


@router.post("/candidates/password-reset/confirm")
def confirm_password_reset(request: PasswordResetConfirm):
    identifier = request.identifier.strip()
    is_email = "@" in identifier
    destination = identifier.lower() if is_email else normalize_phone(identifier)
    if not destination or (is_email and (identifier.startswith("@") or identifier.endswith("@"))):
        raise HTTPException(status_code=422, detail="Enter a valid email address or phone number")
    session = sessionLocal()
    try:
        lookup = select(Candidate).where(
            func.lower(Candidate.email) == destination if is_email else Candidate.phone_number == destination
        )
        candidate = session.execute(lookup).scalar_one_or_none()
        if candidate is None:
            raise HTTPException(status_code=400, detail="That code is invalid or expired. Request a new one.")

        reset_code = session.execute(
            select(PasswordResetCode)
            .where(PasswordResetCode.candidate_id == candidate.id)
            .order_by(PasswordResetCode.created_at.desc())
        ).scalars().first()
        if not reset_code or reset_code.expires_at < datetime.now() or reset_code.attempts >= 5:
            raise HTTPException(status_code=400, detail="That code is invalid or expired. Request a new one.")

        if not secrets.compare_digest(hash_reset_code(request.code, reset_code.code_salt), reset_code.code_hash):
            reset_code.attempts += 1
            session.commit()
            raise HTTPException(status_code=400, detail="That code is incorrect. Try again.")

        candidate.password = hash_password(request.new_password)
        session.execute(delete(PasswordResetCode).where(PasswordResetCode.candidate_id == candidate.id))
        session.commit()
        return {"message": "Your password has been updated. You can now sign in."}
    finally:
        session.close()

@router.delete("/candidates/{id}")
def delete_candidate(id: int):
    session = sessionLocal()
    try:
        statement = select(Candidate).where(Candidate.id == id)
        result = session.execute(statement)
        candidate = result.scalar_one_or_none()

        if candidate is None:
            raise HTTPException(status_code = 404, detail = "Candidate not found")

        session.delete(candidate)
        session.commit()

        return "Deleted successfully!"

    finally:
        session.close()
