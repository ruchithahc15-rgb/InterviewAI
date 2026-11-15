import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import apiClient from "../api/client";
import { getCandidateId } from "../api/session";
import { Icon } from "../components/AppShell";
import { printInterviewPdf, saveInterviewDoc } from "../utils/exportInterview";

function QuestionBank() {
  const candidateId = Number(getCandidateId());
  const [interviews, setInterviews] = useState([]);
  const [items, setItems] = useState([]);
  const [responses, setResponses] = useState([]);
  const [candidate, setCandidate] = useState(null);
  const [selectedInterviewId, setSelectedInterviewId] = useState("");
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const pickerRef = useRef(null);
  const [searchParams] = useSearchParams();
  const search = searchParams.get("q") || "";

  useEffect(() => {
    async function loadQuestions() {
      try {
        const [interviewsRes, questionsRes, responsesRes, candidateRes] = await Promise.all([
          apiClient.get("/interviews"), apiClient.get("/questions"), apiClient.get("/responses"), apiClient.get(`/candidates/${candidateId}`),
        ]);
        const mine = interviewsRes.data.filter((interview) => interview.candidate_id === candidateId)
          .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0) || b.id - a.id);
        const mineById = new Map(mine.map((interview) => [interview.id, interview]));
        setInterviews(mine);
        setItems(questionsRes.data.filter((question) => mineById.has(question.interview_id)).map((question) => ({ ...question, interview: mineById.get(question.interview_id) })));
        const questionIds = new Set(questionsRes.data.filter((question) => mineById.has(question.interview_id)).map((question) => question.id));
        setResponses(responsesRes.data.filter((response) => questionIds.has(response.question_id)));
        setCandidate(candidateRes.data);
      } catch (loadError) {
        console.error(loadError);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    loadQuestions();
  }, [candidateId]);

  useEffect(() => {
    if (!pickerOpen) return undefined;
    const closeOutside = (event) => { if (!pickerRef.current?.contains(event.target)) setPickerOpen(false); };
    const closeEscape = (event) => { if (event.key === "Escape") setPickerOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [pickerOpen]);

  const selectedInterview = interviews.find((item) => String(item.id) === selectedInterviewId);
  const interviewQuestions = items.filter((item) => item.interview_id === selectedInterview?.id);
  const filteredQuestions = useMemo(() => interviewQuestions.filter((item) => `${item.question} ${item.skill || ""}`.toLowerCase().includes(search.toLowerCase())), [interviewQuestions, search]);
  const selectedQuestion = filteredQuestions.find((item) => item.id === selectedQuestionId);
  const selectedResponse = responses.find((response) => response.question_id === selectedQuestion?.id);
  const exportData = selectedInterview ? {
    interview: selectedInterview,
    candidate,
    questions: interviewQuestions.map((question) => ({
      ...question,
      answer: responses.find((response) => response.question_id === question.id)?.answer,
    })),
  } : null;
  const selectedInterviewLabel = selectedInterview
    ? `${selectedInterview.role} · ${selectedInterview.company} · ${selectedInterview.created_at ? new Date(selectedInterview.created_at).toLocaleDateString() : "Date unavailable"}`
    : "Choose an interview to view its questions";

  function chooseInterview(id) {
    setSelectedInterviewId(String(id));
    setSelectedQuestionId(null);
    setPickerOpen(false);
  }

  return (
    <div className="content-column question-bank-page">
      <div className="question-intro panel"><span className="question-intro-icon"><Icon name="stack" size={24} /></span><div><h2>Questions worth revisiting</h2><p>Choose a session to review its questions and saved answers.</p></div><span className="question-total">{selectedInterview ? interviewQuestions.length : items.length}<small>{selectedInterview ? "IN THIS INTERVIEW" : "QUESTIONS SAVED"}</small></span></div>
      {loading ? <div className="panel loading-state"><span className="loading-spinner" />Gathering your interviews…</div> : error ? <div className="panel empty-state"><h3>Your question bank is unavailable</h3><p>Check your connection and try again.</p></div> : <>
        <section className="question-session-bar panel" aria-label="Choose interview">
          <div><span className="eyebrow teal-eyebrow">QUESTION BANK</span><h2>Select an interview</h2></div>
          <div className="interview-picker" ref={pickerRef}>
            <button type="button" className="interview-picker-trigger" aria-haspopup="listbox" aria-expanded={pickerOpen} aria-controls="question-bank-interview-options" onClick={() => setPickerOpen((open) => !open)}><span>{selectedInterviewLabel}</span><Icon name="arrow" size={17} /></button>
            {pickerOpen && <div className="interview-picker-menu" id="question-bank-interview-options" role="listbox" aria-label="Your interviews">
              {interviews.length ? interviews.map((interview) => <button type="button" role="option" aria-selected={String(interview.id) === selectedInterviewId} key={interview.id} onClick={() => chooseInterview(interview.id)}><span><strong>{interview.role}</strong><small>{interview.company || "Company not provided"} · {interview.created_at ? new Date(interview.created_at).toLocaleString() : "Date unavailable"}</small></span><i>{String(interview.id) === selectedInterviewId ? "Selected" : `${items.filter((question) => question.interview_id === interview.id).length} questions`}</i></button>) : <p>No interviews have been created yet.</p>}
            </div>}
          </div>
        </section>
        {!selectedInterview ? <section className="interview-session-list" aria-label="Your interviews">
          {interviews.length ? interviews.map((interview) => <button type="button" className="interview-session-card panel" key={interview.id} onClick={() => chooseInterview(interview.id)}>
            <span className="library-avatar"><Icon name="file" size={20} /></span>
            <span className="interview-session-copy"><strong>{interview.role}</strong><small>{interview.company || "Company not provided"}</small><em>{items.filter((item) => item.interview_id === interview.id).length} questions</em></span>
            <Icon name="arrow" size={17} />
          </button>) : null}
        </section> : <div className="question-workspace">
          <section className="question-list-panel">
            <div className="question-list-heading"><div><span className="eyebrow teal-eyebrow">{selectedInterview.role}</span><h2>{selectedInterview.company || "Practice session"}</h2></div><span>{filteredQuestions.length} questions</span></div>
            {filteredQuestions.length ? <div className="question-list">{filteredQuestions.map((item, index) => <button type="button" className={`panel question-card ${selectedQuestionId === item.id ? "is-selected" : ""}`} key={item.id} onClick={() => setSelectedQuestionId(item.id)} aria-pressed={selectedQuestionId === item.id}><div className="question-card-top"><span className="question-number">{String(index + 1).padStart(2, "0")}</span><span className="question-role">{item.skill || selectedInterview.role}</span></div><h3>{item.question}</h3><p><Icon name="file" size={15} /> {selectedInterview.company || "InterviewAI practice"}</p></button>)}</div> : <div className="panel empty-state"><h3>{search ? "No matching questions" : "No questions saved for this session"}</h3><p>{search ? "Try another search term." : "This interview does not have questions yet."}</p></div>}
          </section>
          <aside className="panel question-answer-panel">
            <div className="question-answer-heading"><span className="eyebrow teal-eyebrow">INTERVIEW EXPORT</span><h2>{selectedInterview.role}</h2><p>{selectedInterview.company || "Company not provided"} · {selectedInterview.created_at ? new Date(selectedInterview.created_at).toLocaleString() : "Date unavailable"}</p></div>
            <div className="question-export-actions"><button type="button" className="button-secondary" onClick={() => printInterviewPdf(exportData)}><Icon name="file" size={17} />Save PDF</button><button type="button" className="button-primary" onClick={() => saveInterviewDoc(exportData)}><Icon name="file" size={17} />Save DOC</button></div>
            <p className="export-note">Exports include every question and answer in this interview.</p>
            {selectedInterview.research_sources?.length > 0 && <div className="research-source-list"><strong>Research references</strong>{selectedInterview.research_sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title}<Icon name="arrow" size={13} /></a>)}</div>}
            {selectedQuestion ? <div className="question-answer-content"><span>QUESTION {String(filteredQuestions.indexOf(selectedQuestion) + 1).padStart(2, "0")}</span><h3>{selectedQuestion.question}</h3>{selectedQuestion.skill && <small>{selectedQuestion.skill}</small>}<span>YOUR ANSWER</span><p>{selectedResponse?.answer?.trim() || "No answer was saved for this question."}</p></div> : <div className="question-answer-empty"><span className="metric-icon"><Icon name="file" size={22} /></span><h3>Select a question</h3><p>Your saved answer will appear here. The export buttons include the whole interview.</p></div>}
          </aside>
        </div>}
      </>}
    </div>
  );
}

export default QuestionBank;
