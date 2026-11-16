import unittest
import os
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ.setdefault("GOOGLE_API_KEY", "test-key")
os.environ.setdefault("DEEPGRAM_API_KEY", "test-key")

from backend.database import Base
from backend.models.candidate import Candidate
from backend.models.evaluation import Evaluation
from backend.models.interview import Interview
from backend.models.interview_result import InterviewResult
from backend.models.question import Question
from backend.models.response import Response
from backend.api import candidate as candidate_api
from backend.api import evaluation as evaluation_api
from backend.api import interview as interview_api
from backend.api import question as question_api


class CandidateAuthFlowTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.session_factory_patch = patch.object(candidate_api, "sessionLocal", self.Session)
        self.session_factory_patch.start()
        app = FastAPI()
        app.include_router(candidate_api.router)
        app.include_router(interview_api.router)
        app.include_router(question_api.router)
        app.include_router(evaluation_api.router)
        self.client = TestClient(app)
        self.evaluation_session_patch = patch.object(evaluation_api, "sessionLocal", self.Session)
        self.evaluation_session_patch.start()
        self.interview_session_patch = patch.object(interview_api, "sessionLocal", self.Session)
        self.interview_session_patch.start()
        self.question_session_patch = patch.object(question_api, "sessionLocal", self.Session)
        self.question_session_patch.start()

    def tearDown(self):
        self.client.close()
        self.evaluation_session_patch.stop()
        self.interview_session_patch.stop()
        self.question_session_patch.stop()
        self.session_factory_patch.stop()
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def test_signup_email_and_phone_sign_in(self):
        invalid_phone = self.client.post("/candidates", json={
            "name": "Invalid Phone", "email": "invalid@example.com",
            "phone_number": "+1 202 555 0144", "password": "original-pass-8",
        })
        self.assertEqual(invalid_phone.status_code, 422)
        signup = self.client.post("/candidates", json={
            "name": "Ruchi Test",
            "email": "Ruchi@example.com",
            "phone_number": "+91 98765 43210",
            "password": "original-pass-8",
        })
        self.assertEqual(signup.status_code, 200, signup.text)
        candidate_id = signup.json()["id"]
        self.assertEqual(signup.json()["phone_number"], "+919876543210")
        with self.Session() as session:
            candidate = session.get(Candidate, candidate_id)
            candidate.email_verified = True
            candidate.phone_verified = True
            session.commit()

        email_login = self.client.post("/candidates/login", json={
            "email": "ruchi@example.com", "password": "original-pass-8",
        })
        self.assertEqual(email_login.status_code, 200, email_login.text)
        self.assertEqual(email_login.json()["candidate_id"], candidate_id)

        phone_login = self.client.post("/candidates/login", json={
            "email": "+91 98765 43210", "password": "original-pass-8",
        })
        self.assertEqual(phone_login.status_code, 200, phone_login.text)
        self.assertEqual(phone_login.json()["candidate_id"], candidate_id)


    def test_interview_feedback_is_a_single_idempotent_report(self):
        with self.Session() as session:
            candidate = Candidate(name="Report Test", email="report@example.com", password="hashed")
            interview = Interview(candidate_att=candidate, company="Acme", role="Engineer", status="completed")
            question = Question(interview_question=interview, question="Explain a hash map.")
            response = Response(question=question, answer="A hash map stores values by key.")
            session.add(interview)
            session.commit()
            interview_id = interview.id

        generated = SimpleNamespace(
            accuracy_score=80, relevance_score=80, technical_score=80,
            grammar_score=80, confidence_score=80, filler_word_count=0,
            feedback="Clear explanation.", strengths="Good structure.",
        )
        with patch.object(evaluation_api, "evaluate_response", return_value=generated) as evaluate:
            first = self.client.post(f"/interview/{interview_id}/generate-evaluation")
            second = self.client.post(f"/interview/{interview_id}/generate-evaluation")
        self.assertEqual(first.status_code, 200, first.text)
        self.assertEqual(second.status_code, 200, second.text)
        self.assertEqual(first.json()["id"], second.json()["id"])
        evaluate.assert_called_once()
        self.assertEqual(len(self.client.get("/interview-results").json()), 1)
        self.assertEqual(self.client.get(f"/interviews/{interview_id}/result").status_code, 200)
        with self.Session() as session:
            self.assertEqual(len(session.execute(select(Evaluation)).scalars().all()), 1)
            self.assertEqual(len(session.execute(select(InterviewResult)).scalars().all()), 1)

    def test_google_login_creates_and_reuses_verified_candidate(self):
        google_user = {
            "email": "google@example.com",
            "emailVerified": True,
            "displayName": "Google Candidate",
            "providerUserInfo": [{"providerId": "google.com"}],
        }
        with patch.object(candidate_api, "verify_firebase_id_token", return_value=google_user):
            first = self.client.post("/candidates/google-login", json={"id_token": "verified-firebase-id-token"})
            second = self.client.post("/candidates/google-login", json={"id_token": "verified-firebase-id-token"})
        self.assertEqual(first.status_code, 200, first.text)
        self.assertEqual(second.status_code, 200, second.text)
        self.assertEqual(first.json()["candidate_id"], second.json()["candidate_id"])
        self.assertEqual(first.json()["name"], "Google Candidate")
        with self.Session() as session:
            self.assertEqual(len(session.execute(select(Candidate)).scalars().all()), 1)

    def test_google_login_rejects_unverified_or_non_google_identity(self):
        invalid_users = [
            {"email": "google@example.com", "emailVerified": False, "providerUserInfo": [{"providerId": "google.com"}]},
            {"email": "google@example.com", "emailVerified": True, "providerUserInfo": [{"providerId": "password"}]},
        ]
        for user in invalid_users:
            with patch.object(candidate_api, "verify_firebase_id_token", return_value=user):
                response = self.client.post("/candidates/google-login", json={"id_token": "verified-firebase-id-token"})
            self.assertEqual(response.status_code, 401)
        with self.Session() as session:
            self.assertEqual(session.execute(select(Candidate)).scalars().all(), [])

    def test_selected_interview_skills_persist_and_tag_generated_questions(self):
        signup = self.client.post("/candidates", json={
            "name": "Skill Test", "email": "skills@example.com", "password": "strong-pass-8",
        })
        interview = self.client.post("/interviews", json={
            "candidate_id": signup.json()["id"], "company": "Acme", "role": "Frontend Engineer",
            "skills": ["React", "TypeScript"],
        })
        self.assertEqual(interview.status_code, 200, interview.text)
        self.assertEqual(interview.json()["skills"], ["React", "TypeScript"])
        generated = [
            SimpleNamespace(question=f"Question {index}", skill="not-selected")
            for index in range(5)
        ]
        with patch.object(question_api, "generate_questions", return_value=generated) as generate:
            response = self.client.post(f"/interviews/{interview.json()['id']}/generate-questions")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual([item["skill"] for item in response.json()], ["React", "TypeScript", "React", "TypeScript", "React"])
        generate.assert_called_once_with(role="Frontend Engineer", company="Acme", skills=["React", "TypeScript"])

    def test_question_generation_accepts_string_results_from_generator(self):
        signup = self.client.post("/candidates", json={
            "name": "String Generator", "email": "strings@example.com", "password": "strong-pass-8",
        })
        interview = self.client.post("/interviews", json={
            "candidate_id": signup.json()["id"], "company": "Acme", "role": "Engineer",
            "skills": ["Java", "Spring Boot"],
        })
        with patch.object(question_api, "generate_questions", return_value=[f"Question {index}" for index in range(5)]):
            response = self.client.post(f"/interviews/{interview.json()['id']}/generate-questions")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()[0]["question"], "Question 0")
        self.assertEqual(response.json()[0]["skill"], "Java")
        self.assertEqual(response.json()[1]["skill"], "Spring Boot")

    def test_deleting_interview_removes_its_questions_answers_and_result(self):
        signup = self.client.post("/candidates", json={
            "name": "Delete Test", "email": "delete@example.com", "password": "strong-pass-8",
        })
        interview = self.client.post("/interviews", json={
            "candidate_id": signup.json()["id"], "company": "Example", "role": "Engineer",
        })
        with self.Session() as session:
            question = Question(interview_id=interview.json()["id"], question="Describe a design tradeoff")
            session.add(question)
            session.flush()
            session.add(Response(question_id=question.id, answer="I would compare the constraints."))
            session.add(InterviewResult(interview_id=interview.json()["id"], total_score=81))
            session.commit()
        deleted = self.client.delete(f"/interviews/{interview.json()['id']}")
        self.assertEqual(deleted.status_code, 200, deleted.text)
        with self.Session() as session:
            self.assertEqual(session.execute(select(Interview).where(Interview.id == interview.json()["id"])).scalars().all(), [])
            self.assertEqual(session.execute(select(Question)).scalars().all(), [])
            self.assertEqual(session.execute(select(Response)).scalars().all(), [])
            self.assertEqual(session.execute(select(InterviewResult)).scalars().all(), [])


if __name__ == "__main__":
    unittest.main()
