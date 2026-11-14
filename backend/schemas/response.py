from pydantic import BaseModel
from typing import Optional
from backend.schemas.base import ORMResponse

class CreateResponse(BaseModel):
    question_id: int
    answer: Optional[str] = None

class ResponseResponse(ORMResponse):
    id: int
    question_id: int
    answer: Optional[str] = None
