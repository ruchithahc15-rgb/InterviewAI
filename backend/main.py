import os

from dotenv import load_dotenv
from fastapi import FastAPI
from backend.api import candidate
from backend.api import interview
from backend.api import question
from backend.api import response
from backend.api import evaluation
from backend.database import Base, engine
from backend.models.candidate import Candidate
from backend.models.interview import Interview
from backend.models.question import Question
from backend.models.response import Response
from backend.models.evaluation import Evaluation
from backend.models.interview_result import InterviewResult
from backend.models.password_reset_code import PasswordResetCode
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

load_dotenv()

app = FastAPI()
backend = app

configured_origins = [origin.strip().rstrip("/") for origin in os.getenv("FRONTEND_ORIGINS", "").split(",") if origin.strip()]
allowed_origins = list(dict.fromkeys([
    "http://localhost:5173",
    "https://d2roa503h8m1gf.cloudfront.net",
    *configured_origins,
]))

app.add_middleware(    
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

backend.include_router(evaluation.router)
backend.include_router(candidate.router)
backend.include_router(interview.router)
backend.include_router(question.router)
backend.include_router(response.router)

Base.metadata.create_all(engine)

# These additions preserve existing account and interview data while allowing
# older databases to adopt phone sign-in and dated session history.
with engine.begin() as connection:
    inspector = inspect(connection)
    candidate_columns = {column["name"] for column in inspector.get_columns("candidates")}
    if "phone_number" not in candidate_columns:
        connection.execute(text("ALTER TABLE candidates ADD COLUMN phone_number VARCHAR(32)"))
    if "email_verified" not in candidate_columns:
        connection.execute(text("ALTER TABLE candidates ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT TRUE"))
    if "phone_verified" not in candidate_columns:
        connection.execute(text("ALTER TABLE candidates ADD COLUMN phone_verified BOOLEAN NOT NULL DEFAULT TRUE"))
    interview_columns = {column["name"] for column in inspector.get_columns("interviews")}
    if "created_at" not in interview_columns:
        connection.execute(text("ALTER TABLE interviews ADD COLUMN created_at TIMESTAMP NULL"))
    if "skills" not in interview_columns:
        connection.execute(text("ALTER TABLE interviews ADD COLUMN skills JSON"))
        connection.execute(text("UPDATE interviews SET skills = '[]' WHERE skills IS NULL"))
    if "research_sources" not in interview_columns:
        connection.execute(text("ALTER TABLE interviews ADD COLUMN research_sources JSON"))
        connection.execute(text("UPDATE interviews SET research_sources = '[]' WHERE research_sources IS NULL"))
    question_columns = {column["name"] for column in inspect(connection).get_columns("questions")}
    if "skill" not in question_columns:
        connection.execute(text("ALTER TABLE questions ADD COLUMN skill VARCHAR(120)"))
    reset_code_columns = {column["name"] for column in inspect(connection).get_columns("password_reset_codes")}
    if "purpose" not in reset_code_columns:
        connection.execute(text("ALTER TABLE password_reset_codes ADD COLUMN purpose VARCHAR(32) NOT NULL DEFAULT 'password_reset'"))
    if "destination" not in reset_code_columns:
        connection.execute(text("ALTER TABLE password_reset_codes ADD COLUMN destination VARCHAR(255) NULL"))
    phone_indexes = {index["name"] for index in inspect(connection).get_indexes("candidates")}
    if "ix_candidates_phone_number" not in phone_indexes:
        connection.execute(text("CREATE UNIQUE INDEX ix_candidates_phone_number ON candidates (phone_number)"))

@backend.get("/")
def home():
    return {"message": "Welcome to AI Interview Evaluator"}


@backend.get("/health")
def health():
    return {"status": "ok"}
