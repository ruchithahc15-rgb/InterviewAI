from pydantic import BaseModel
from datetime import datetime
from backend.schemas.base import ORMResponse

class CreateInterview(BaseModel):
    candidate_id : int
    company : str
    role : str

class InterviewResponse(ORMResponse):
    id : int
    candidate_id : int
    company : str
    role : str
    status : str
    created_at: datetime | None = None

class UpdateInterview(BaseModel):
    candidate_id : int
    company : str
    role : str
