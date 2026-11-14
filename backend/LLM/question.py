import os
import time
from dotenv import load_dotenv
from openai import OpenAI
from backend.schemas.question import GeneratedQuestions

load_dotenv()

API_KEY = os.getenv("GOOGLE_API_KEY")

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"

gemini = OpenAI(
    base_url=GEMINI_BASE_URL,
    api_key=API_KEY,
)

def generate_questions(role, company):

    system_prompt = f"""You are a senior {role} engineer at {company}.
Your company is hiring for {role} freshers.
Give me 5 technical questions you would ask the candidate."""

    user_prompt_prefix = "Good morning sir."

    messages = [
        {
            "role": "system",
            "content": system_prompt
        },
        {
            "role": "user",
            "content": user_prompt_prefix
        }
    ]

    for attempt in range(3):
        try:
            response = gemini.chat.completions.parse(
                model="gemini-3-flash-preview",
                messages=messages,
                response_format=GeneratedQuestions
            )

            raw_generated_questions = response.choices[0].message.parsed.questions

            if len(raw_generated_questions) != 5:
                raise ValueError("LLM did not generate exactly 5 questions")

            return [question.question for question in raw_generated_questions]

        except Exception as e:
            error_text = str(e)

            if (
                "503" in error_text
                or "UNAVAILABLE" in error_text
                ):
                if attempt < 2:
                    time.sleep(15)
                    continue

            raise