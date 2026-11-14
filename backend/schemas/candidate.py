from pydantic import BaseModel, Field
from backend.schemas.base import ORMResponse

class CreateCandidate(BaseModel):
    name: str
    email: str
    password: str
    phone_number: str | None = None

class CandidateResponse(ORMResponse):
    id: int
    name: str
    email: str
    phone_number: str | None = None

class CandidateUpdate(BaseModel):
    name: str
    email: str
    phone_number: str | None = None

class LoginCandidate(BaseModel):
    email: str
    password: str

class PasswordResetRequest(BaseModel):
    identifier: str

class PasswordResetConfirm(BaseModel):
    identifier: str
    code: str
    new_password: str = Field(min_length=8)
