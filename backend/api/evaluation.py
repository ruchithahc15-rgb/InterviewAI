from backend.database import sessionLocal
from backend.models.evaluation import Evaluation
from backend.models.question import Question
from backend.models.response import Response
from backend.models.interview import Interview
from backend.models.interview_result import InterviewResult
from backend.schemas.evaluation import CreateEvaluation, EvaluationResponse
from sqlalchemy import select
from fastapi import HTTPException, APIRouter
from backend.LLM.evaluation import evaluate_response
from backend.schemas.interview_result import InterviewResultResponse
from backend.services.scoring import calculate_interview_score

router = APIRouter()

@router.get("/interview-results", response_model=list[InterviewResultResponse])
def get_interview_results():
    session = sessionLocal()
    try:
        return session.execute(select(InterviewResult)).scalars().all()
    finally:
        session.close()

@router.get("/interviews/{id}/result", response_model=InterviewResultResponse)
def get_interview_result(id: int):
    session = sessionLocal()
    try:
        result = session.execute(
            select(InterviewResult).where(InterviewResult.interview_id == id)
        ).scalar_one_or_none()
        if result is None:
            raise HTTPException(status_code=404, detail="Interview result not found")
        return result
    finally:
        session.close()

@router.post("/evaluations", response_model=EvaluationResponse)
def create_evaluation(evaluation: CreateEvaluation):
    session = sessionLocal()
    try:
        statement = select(Response).where(Response.id == evaluation.response_id)
        result = session.execute(statement)
        response = result.scalar_one_or_none()

        if response is None:
            raise HTTPException(status_code=404, detail="Response not found")

        if response.evaluation is not None:
            raise HTTPException(status_code=409, detail="Feedback for this answer already exists")

        evaluation_db = Evaluation(response_id=evaluation.response_id,
                                         accuracy_score=evaluation.accuracy_score,
                                         relevance_score=evaluation.relevance_score,
                                         technical_score=evaluation.technical_score,
                                         grammar_score=evaluation.grammar_score,
                                         confidence_score=evaluation.confidence_score,
                                         filler_word_count=evaluation.filler_word_count,
                                         feedback=evaluation.feedback,
                                         strengths=evaluation.strengths)
        session.add(evaluation_db)
        session.commit()
        session.refresh(evaluation_db)
        return evaluation_db

    finally:
        session.close()

@router.get("/evaluations", response_model=list[EvaluationResponse])
def get_evaluations():
    session = sessionLocal()
    statement = select(Evaluation)
    result = session.execute(statement)
    evaluations = result.scalars().all()
    session.close()
    return evaluations

@router.get("/evaluations/{id}", response_model=EvaluationResponse)
def get_single_evaluation(id: int):
    session = sessionLocal()
    try:
        statement = select(Evaluation).where(Evaluation.id == id)
        result = session.execute(statement)
        evaluation = result.scalar_one_or_none()

        if evaluation is None:
            raise HTTPException(status_code=404, detail="Evaluation not found")

        return evaluation

    finally:
        session.close()

@router.delete("/evaluations/{id}")
def delete_evaluation(id:int):
    session = sessionLocal()
    try:
        statement = select(Evaluation).where(Evaluation.id == id)
        result = session.execute(statement)
        evaluation = result.scalar_one_or_none()

        if evaluation is None:
            raise HTTPException(status_code=404, detail="Evaluation not found")

        session.delete(evaluation)
        session.commit()
        return "Evaluation deleted successfully"

    finally:
        session.close()

@router.post("/responses/{id}/generate-evaluation", response_model=EvaluationResponse)
def generate_evaluation(id: int):
    session = sessionLocal()
    try:
        statement = select(Response).where(Response.id == id)
        result = session.execute(statement)
        response = result.scalar_one_or_none()

        if response is None:
            raise HTTPException(status_code=404, detail="Response not found")

        if response.evaluation is not None:
            return response.evaluation

        statement = select(Question).where(Question.id == response.question_id)
        result = session.execute(statement)
        question = result.scalar_one_or_none()

        if question is None:
            raise HTTPException(status_code=404, detail="Question not found")

        generated_evaluation = evaluate_response(question= question.question, answer= response.answer)
        evaluation_db = Evaluation(
            response_id=response.id,
            accuracy_score=generated_evaluation.accuracy_score,
            relevance_score=generated_evaluation.relevance_score,
            technical_score=generated_evaluation.technical_score,
            grammar_score=generated_evaluation.grammar_score,
            confidence_score=generated_evaluation.confidence_score,
            filler_word_count=generated_evaluation.filler_word_count,
            feedback=generated_evaluation.feedback,
            strengths=generated_evaluation.strengths
        )

        session.add(evaluation_db)
        session.commit()
        session.refresh(evaluation_db)
        return evaluation_db

    finally:
        session.close()

@router.post("/interview/{id}/generate-evaluation", response_model= InterviewResultResponse)
def interview_result(id: int):
    session = sessionLocal()
    try:
        statement = select(Interview).where(Interview.id == id)
        result = session.execute(statement)
        interview = result.scalar_one_or_none()

        if interview is None:
            raise HTTPException(status_code=404, detail="Interview not found")

        if interview.status == "completed":

            if interview.interview_result_att is not None:
                return interview.interview_result_att

            if interview.interview_result_att is None:
                responses_obj = interview.question_interview
                total_questions = len(responses_obj)
                answered_responses = [q.response for q in responses_obj if
                                      q.response is not None and q.response.answer is not None]
                evaluation_db = []
                for response in answered_responses:
                    if response.evaluation is not None:
                        evaluation_db.append(response.evaluation)
                        continue
                    evaluation = evaluate_response(question=response.question.question, answer=response.answer)
                    evaluation_db.append(Evaluation(
                        response_id=response.id,
                        accuracy_score=evaluation.accuracy_score,
                        relevance_score=evaluation.relevance_score,
                        technical_score=evaluation.technical_score,
                        grammar_score=evaluation.grammar_score,
                        confidence_score=evaluation.confidence_score,
                        filler_word_count=evaluation.filler_word_count,
                        feedback=evaluation.feedback,
                        strengths=evaluation.strengths
                    ))

                interview_score = calculate_interview_score(evaluation_db, total_questions)
                interview_result_db = InterviewResult(
                    interview_id = id,
                    total_score = interview_score,
                )
                session.add_all([item for item in evaluation_db if item.id is None])
                session.add(interview_result_db)
                session.commit()
                for obj in evaluation_db:
                    session.refresh(obj)
                session.refresh(interview_result_db)

                return interview_result_db

            else:
                raise HTTPException(status_code=409, detail="Interview results already exist")

        else:
            raise HTTPException(status_code=409, detail="Interview not yet completed")

    finally:
        session.close()
