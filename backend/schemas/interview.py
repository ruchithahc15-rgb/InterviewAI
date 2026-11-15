from pydantic import BaseModel, Field
from datetime import datetime
from backend.schemas.base import ORMResponse

class CreateInterview(BaseModel):
    candidate_id : int
    company : str
    role : str
    skills: list[str] = Field(default_factory=list)

class InterviewResponse(ORMResponse):
    id : int
    candidate_id : int
    company : str
    role : str
    skills: list[str] = Field(default_factory=list)
    research_sources: list[dict[str, str]] = Field(default_factory=list)
    research_sources: list[dict[str, str]] = Field(default_factory=list)
    status : str
    created_at: datetime | None = None

class UpdateInterview(BaseModel):
    candidate_id : int
    company : str
    role : str
    skills: list[str] | None = None
