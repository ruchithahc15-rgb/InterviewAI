from sqlalchemy.orm import relationship
from backend.database import Base
from sqlalchemy import Column, String, Integer, ForeignKey

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True)
    
    question = Column(String)

    skill = Column(String(120), nullable=True)

    interview_id = Column(Integer, ForeignKey("interviews.id"))

    interview_question = relationship("Interview", back_populates="question_interview")

    response = relationship("Response", back_populates="question", uselist=False)
