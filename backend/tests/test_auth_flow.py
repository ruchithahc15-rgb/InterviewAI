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
from backend.models.password_reset_code import PasswordResetCode
from backend.models.question import Question
from backend.models.response import Response
from backend.api import candidate as candidate_api
from backend.api import evaluation as evaluation_api


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
        app.include_router(evaluation_api.router)
        self.client = TestClient(app)
        self.evaluation_session_patch = patch.object(evaluation_api, "sessionLocal", self.Session)
        self.evaluation_session_patch.start()

    def tearDown(self):
        self.client.close()
        self.evaluation_session_patch.stop()
        self.session_factory_patch.stop()
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def test_signup_email_and_phone_sign_in_and_password_reset(self):
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

        with patch.object(candidate_api, "deliver_reset_code") as send_code, patch.object(candidate_api, "reset_delivery_configured", return_value=True), patch.object(candidate_api.secrets, "choice", return_value="4"):
            request_code = self.client.post("/candidates/password-reset/request", json={"identifier": "+91 98765 43210"})
            self.assertEqual(request_code.status_code, 200, request_code.text)
            send_code.assert_called_once_with("+919876543210", "444444", False)

        reset = self.client.post("/candidates/password-reset/confirm", json={
            "identifier": "+91 98765 43210", "code": "444444", "new_password": "new-passphrase-9",
        })
        self.assertEqual(reset.status_code, 200, reset.text)

        old_password = self.client.post("/candidates/login", json={
            "email": "ruchi@example.com", "password": "original-pass-8",
        })
        new_password = self.client.post("/candidates/login", json={
            "email": "ruchi@example.com", "password": "new-passphrase-9",
        })
        self.assertEqual(old_password.status_code, 401)
        self.assertEqual(new_password.status_code, 200, new_password.text)
        with self.Session() as session:
            self.assertEqual(session.execute(select(PasswordResetCode)).scalars().all(), [])

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


if __name__ == "__main__":
    unittest.main()
