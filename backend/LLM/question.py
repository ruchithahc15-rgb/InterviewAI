import json
import os
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from dotenv import load_dotenv
from backend.schemas.question import GeneratedQuestions

load_dotenv()

API_KEY = os.getenv("GOOGLE_API_KEY")

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3-flash-preview")

def generate_questions(role, company, skills=None):
    skills = [skill.strip() for skill in (skills or []) if skill and skill.strip()]
    skill_instruction = (
        f"Focus only on these requested skills: {', '.join(skills)}. Return a skill field for each question using the exact matching skill name, and distribute the five questions across the selected skills."
        if skills else "Return a concise skill label for each question that best describes its main technical topic."
    )
    company_context = company.strip() if company and company.strip() else "an organization hiring for this role"
    prompt = f"""Create exactly five original, practical interview questions for the {role} role at {company_context}.
Use Google Search to research publicly reported questions, candidate interview experiences, and the company's official role or engineering materials. Prefer recent first-hand candidate reports and official company pages. Adapt researched topics into clear, original questions; do not copy long passages or claim these exact questions were asked. If the company is not provided or reliable company reports are unavailable, use role-relevant sources and say nothing company-specific. Return each question with a short exact skill label.
{skill_instruction}"""
    response_schema = {
        "type": "OBJECT",
        "properties": {"questions": {
            "type": "ARRAY",
            "items": {"type": "OBJECT", "properties": {
                "question": {"type": "STRING"}, "skill": {"type": "STRING"},
            }, "required": ["question", "skill"]},
        }},
        "required": ["questions"],
    }

    enable_search = True
    for attempt in range(3):
        try:
            if not API_KEY:
                raise RuntimeError("Question research is not configured. Set GOOGLE_API_KEY on the backend.")

            body = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"responseMimeType": "application/json", "responseSchema": response_schema},
            }
            if enable_search:
                body["tools"] = [{"google_search": {}}]

            request = Request(
                f"{GEMINI_BASE_URL}/{GEMINI_MODEL}:generateContent",
                data=json.dumps(body).encode("utf-8"),
                headers={"Content-Type": "application/json", "x-goog-api-key": API_KEY},
                method="POST",
            )
            try:
                with urlopen(request, timeout=60) as api_response:
                    payload = json.loads(api_response.read().decode("utf-8"))
            except HTTPError as error:
                detail = error.read().decode("utf-8", errors="replace")[:600]
                # If Google Search Grounding tool hits rate limit or quota (429), fall back without search tool
                if error.code == 429 and enable_search:
                    enable_search = False
                    time.sleep(1)
                    continue
                if error.code in (429, 503) and attempt < 2:
                    time.sleep(3)
                    continue
                raise RuntimeError(f"Interview question research failed ({error.code}): {detail}") from error
            except (URLError, TimeoutError) as error:
                if attempt < 2:
                    time.sleep(2)
                    continue
                raise RuntimeError("Interview question research is temporarily unavailable.") from error

            candidates = payload.get("candidates") or []
            if not candidates:
                raise ValueError("Question research returned no result")
            candidate = candidates[0]
            answer_text = "".join(part.get("text", "") for part in candidate.get("content", {}).get("parts", []))
            parsed = GeneratedQuestions.model_validate(json.loads(answer_text))
            raw_generated_questions = parsed.questions
            chunks = candidate.get("groundingMetadata", {}).get("groundingChunks", [])
            sources = []
            seen_urls = set()
            for chunk in chunks:
                web = chunk.get("web") or {}
                uri = web.get("uri")
                if uri and uri not in seen_urls:
                    seen_urls.add(uri)
                    sources.append({"title": web.get("title") or uri, "url": uri})

            if len(raw_generated_questions) != 5:
                raise ValueError("LLM did not generate exactly 5 questions")

            return {"questions": raw_generated_questions, "sources": sources}

        except Exception as e:
            error_text = str(e)

            if "503" in error_text or "UNAVAILABLE" in error_text:
                if attempt < 2:
                    time.sleep(15)
                    continue

            raise
