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
    email_verified: bool = True
    phone_verified: bool = True

class CandidateUpdate(BaseModel):
    name: str
    email: str
    phone_number: str | None = None

class LoginCandidate(BaseModel):
    email: str
    password: str

class GoogleLoginCandidate(BaseModel):
    id_token: str = Field(min_length=20)


