import secrets

from fastapi import APIRouter, HTTPException
from sqlalchemy import func, select

from backend.schemas.candidate import CandidateResponse, CreateCandidate, CandidateUpdate, LoginCandidate, GoogleLoginCandidate
from backend.models.candidate import Candidate
from backend.database import sessionLocal
from backend.services.auth import hash_password, verify_password
from backend.services.firebase_auth import verify_firebase_id_token

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
            password=hash_password(candidate.password), email_verified=True, phone_verified=True,
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


@router.post("/candidates/google-login")
def google_login(credentials: GoogleLoginCandidate):
    try:
        user = verify_firebase_id_token(credentials.id_token)
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=401, detail=str(error)) from error
    except ConnectionError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error

    email = (user.get("email") or "").strip().lower()
    providers = user.get("providerUserInfo") or []
    if not email or not user.get("emailVerified") or not any(provider.get("providerId") == "google.com" for provider in providers):
        raise HTTPException(status_code=401, detail="Use a verified Google account to continue.")

    session = sessionLocal()
    try:
        candidate = session.execute(select(Candidate).where(func.lower(Candidate.email) == email)).scalar_one_or_none()
        if candidate is None:
            display_name = (user.get("displayName") or email.split("@", 1)[0]).strip()
            candidate = Candidate(
                name=display_name or "InterviewAI candidate",
                email=email,
                password=hash_password(secrets.token_urlsafe(48)),
                email_verified=True,
            )
            session.add(candidate)
            session.commit()
            session.refresh(candidate)
        elif not candidate.email_verified:
            candidate.email_verified = True
            session.commit()
        return {"candidate_id": candidate.id, "name": candidate.name}
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
        candidate.email_verified = True
        candidate.phone_verified = True

        session.commit()
        session.refresh(candidate)

        return candidate

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
