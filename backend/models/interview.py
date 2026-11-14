from sqlalchemy.orm import relationship

from backend.database import Base
from sqlalchemy import Column, DateTime, Integer, String, ForeignKey
from datetime import datetime

class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True)

    candidate_id = Column(Integer, ForeignKey("candidates.id"))

    company = Column(String)

    role = Column(String)

    status = Column(String, default="in_progress")

    created_at = Column(DateTime, default=datetime.now, nullable=False)

    candidate_att = relationship("Candidate", back_populates = "interview_att")

    question_interview = relationship("Question", back_populates="interview_question")

    interview_result_att = relationship("InterviewResult", back_populates="interview_att", uselist=False)
