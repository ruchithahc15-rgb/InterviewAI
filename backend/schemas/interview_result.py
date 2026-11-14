from datetime import datetime
from pydantic import BaseModel
from backend.schemas.base import ORMResponse

class InterviewResultResponse(ORMResponse):
    id: int
    interview_id: int
    total_score: int
    time_created: datetime
