import os
import unittest

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ.setdefault("GOOGLE_API_KEY", "test-key")
os.environ.setdefault("DEEPGRAM_API_KEY", "test-key")

from sqlalchemy import inspect

from backend.database import engine
from backend.main import app


class StartupMigrationTests(unittest.TestCase):
    @classmethod
    def tearDownClass(cls):
        engine.dispose()

    def test_additive_schema_is_present_without_external_database(self):
        inspector = inspect(engine)
        candidate_columns = {column["name"] for column in inspector.get_columns("candidates")}
        interview_columns = {column["name"] for column in inspector.get_columns("interviews")}
        candidate_indexes = {index["name"] for index in inspector.get_indexes("candidates")}

        self.assertIn("phone_number", candidate_columns)
        self.assertIn("created_at", interview_columns)
        self.assertIn("ix_candidates_phone_number", candidate_indexes)
        self.assertIn("password_reset_codes", inspector.get_table_names())
        self.assertTrue(app.routes)


if __name__ == "__main__":
    unittest.main()
