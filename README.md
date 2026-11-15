> AI-powered technical interview practice that turns every answer into actionable feedback.

[![FastAPI](https://img.shields.io/badge/API-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/frontend-React-61DAFB?logo=react&logoColor=111827)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/database-PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Gemini](https://img.shields.io/badge/AI-Gemini-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)

InterviewAI is a full-stack mock interview platform for developers and technical candidates. Choose a role, company, and skills; receive five research-informed questions; answer by typing or speaking; then get a structured score, strengths, and improvement feedback.

If this project helps you prepare, learn from the architecture, or build your own AI product, consider giving it a ⭐.

## Why it is useful

- Practice realistic, role-specific technical interviews in minutes.
- Use typed answers or browser microphone recording with Deepgram transcription.
- Get consistent scoring across accuracy, relevance, technical quality, confidence, and grammar.
- Revisit questions and answers in the Question Bank.
- Track progress in Analytics and review completed sessions from the Dashboard.
- Export an interview record as DOC or print it as a PDF.
- Keep candidate data isolated by interview and candidate account.

## Product flow

```text
Sign up / Sign in
        ↓
Choose role, company, and skills
        ↓
Generate 5 AI questions
        ↓
Answer by typing or speaking
        ↓
Transcribe + evaluate each response
        ↓
Review score, feedback, history, and progress
```

## Highlights

### Candidate experience

- Email/password authentication with Argon2 password hashing.
- Optional phone verification, password reset, and Google sign-in through Firebase.
- Dashboard with recent activity, feedback, and practice statistics.
- Interview history with in-progress and completed sessions.
- Question Bank with visible session selection, saved answers, research references, and exports.
- Profile editing, local profile photo, and account/session controls.

### AI interview engine

- Google Gemini generates exactly five structured questions per session.
- Optional Google Search grounding adds public company and role context.
- Deepgram converts recorded answers into text.
- Gemini evaluates answers using structured output rather than free-form text.
- Skipped or empty answers are retained and scored appropriately.

### Scoring model

| Dimension | Weight |
| --- | ---: |
| Accuracy | 30% |
| Relevance | 30% |
| Technical quality | 20% |
| Confidence | 10% |
| Grammar | 10% |

## Architecture

```text
React + Vite frontend
          │ Axios / REST
          ▼
FastAPI backend ───────► Google Gemini
          │              Deepgram
          ▼
SQLAlchemy ────────────► PostgreSQL
```

The backend owns AI calls, validation, scoring, persistence, and authentication. The frontend stores only lightweight browser session/profile UI state; Gemini, Deepgram, database, and SMTP/Twilio secrets stay server-side.

## Tech stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 19, Vite, React Router, Axios, CSS, browser Speech Synthesis and MediaRecorder APIs |
| Backend | Python, FastAPI, SQLAlchemy, Pydantic, Uvicorn/Gunicorn |
| Data | PostgreSQL; tables for candidates, interviews, questions, responses, evaluations, results, and reset codes |
| AI / voice | Google Gemini, Gemini Search grounding, Deepgram speech-to-text |
| Auth | Argon2 password hashing, Firebase Google sign-in, email/SMS verification hooks |

## Project structure

```text
InterviewAI/
├── backend/
│   ├── api/              # REST endpoints
│   ├── LLM/              # Gemini question generation and evaluation
│   ├── models/           # SQLAlchemy models
│   ├── schemas/          # Pydantic request/response schemas
│   ├── services/         # Auth, scoring, delivery, Firebase helpers
│   ├── database.py
│   └── main.py
├── frontend/
│   ├── src/api/          # API and Firebase clients
│   ├── src/components/   # Shared shell, auth, and UI components
│   ├── src/pages/        # Dashboard, interview, results, analytics, profile
│   └── src/utils/        # Interview export helpers
├── requirements.txt
└── README.md
```

## Run locally

### 1. Start PostgreSQL

Create a database named `ai_interview`, or use any PostgreSQL database and update `DATABASE_URL`.

### 2. Configure the backend

Create `.env` in the repository root:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/ai_interview
GOOGLE_API_KEY=your_gemini_api_key
DEEPGRAM_API_KEY=your_deepgram_api_key
FRONTEND_ORIGINS=http://localhost:5173,https://your-app.vercel.app

# Optional account recovery / verification
SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
```

Install and start the API:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

API: `http://localhost:8000`  ·  Swagger: `http://localhost:8000/docs`

### 3. Start the frontend

```powershell
cd frontend
npm install
npm run dev
```

Optional frontend `.env` values:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Open the Vite URL shown in the terminal, usually `http://localhost:5173`.

## API surface

The FastAPI backend includes endpoints for:

- Candidate signup, login, profile updates, verification, password reset, and Google login.
- Interview creation, retrieval, update, and deletion.
- AI question generation and question-bank retrieval.
- Typed/transcribed response submission.
- Per-answer evaluation and interview-level results.

Run the server and open `/docs` for the live OpenAPI contract.

## Security notes

- Passwords are hashed with `pwdlib` before storage; plaintext passwords are never persisted.
- API keys and database URLs belong in environment variables, never in source control.
- The frontend stores only a candidate ID, display name, and local profile photo for the current browser experience.
- For production, add server-side sessions or signed tokens, authorization checks on every candidate-owned resource, rate limiting, migrations, monitoring, and managed secret storage.

Never commit `.env` files or expose real API keys in issues, screenshots, or documentation.

## Verification

Frontend checks:

```bash
cd frontend
npm run lint
npm run build
```

Backend tests:

```bash
python -m unittest discover -s backend/tests
```

## Roadmap

- Server-side session/token authentication and stronger resource authorization.
- Alembic migrations and production-grade observability.
- Interview difficulty controls and deeper role-specific personalization.
- More evaluation trends, coaching plans, and shareable reports.
- Expanded test coverage and CI automation.
