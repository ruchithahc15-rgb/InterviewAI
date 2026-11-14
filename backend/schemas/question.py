from pydantic import BaseModel
from backend.schemas.base import ORMResponse

class CreateQuestion(BaseModel):
    interview_id: int
    question : str

class QuestionResponse(ORMResponse):
    id : int
    interview_id : int
    question : str

class UpdateQuestion(BaseModel):
    interview_id: int
    question : str

class GeneratedQuestion(BaseModel):
    question: str

class GeneratedQuestions(BaseModel):
    questions: list[GeneratedQuestion]
