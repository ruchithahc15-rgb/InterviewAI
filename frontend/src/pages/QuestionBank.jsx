import { useEffect, useMemo, useState } from "react";
import apiClient from "../api/client";
import { getCandidateId } from "../api/session";
import { Icon } from "../components/AppShell";

function QuestionBank() {
  const candidateId = Number(getCandidateId());
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadQuestions() {
      try {
        const [interviewsRes, questionsRes] = await Promise.all([apiClient.get("/interviews"), apiClient.get("/questions")]);
        const mine = new Map(interviewsRes.data.filter((interview) => interview.candidate_id === candidateId).map((interview) => [interview.id, interview]));
        setItems(questionsRes.data.filter((question) => mine.has(question.interview_id)).map((question) => ({ ...question, interview: mine.get(question.interview_id) })));
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    loadQuestions();
  }, [candidateId]);

  const filtered = useMemo(() => items.filter((item) => (item.question + " " + item.interview.role + " " + item.interview.company).toLowerCase().includes(search.toLowerCase())), [items, search]);

  return (
    <div className="content-column">
      <div className="question-intro panel"><span className="question-intro-icon"><Icon name="stack" size={24} /></span><div><h2>Questions worth revisiting</h2><p>Your questions are collected from the real practice sessions you’ve created.</p></div><span className="question-total">{items.length}<small>QUESTIONS</small></span></div>
      <div className="question-toolbar"><label className="question-search"><Icon name="search" size={18} /><input aria-label="Filter questions" placeholder="Filter by question, role, or company" value={search} onChange={(event) => setSearch(event.target.value)} /></label><span className="result-count">{filtered.length} shown</span></div>
      {loading ? <div className="panel loading-state"><span className="loading-spinner" />Gathering your questions…</div> : error ? <div className="panel empty-state"><h3>Your question bank is unavailable</h3><p>Check your connection and try again.</p></div> : filtered.length ? <div className="question-list">{filtered.map((item, index) => <article className="panel question-card" key={item.id}><div className="question-card-top"><span className="question-number">{String(index + 1).padStart(2, "0")}</span><span className="question-role">{item.interview.role}</span></div><h3>{item.question}</h3><p><Icon name="file" size={15} /> {item.interview.company}</p></article>)}</div> : <div className="panel empty-state"><span className="empty-icon"><Icon name="stack" size={26} /></span><h3>{search ? "No questions match your search" : "Your question bank is ready to grow"}</h3><p>{search ? "Try a different phrase or role." : "Start a practice interview to generate your first set of role-specific questions."}</p></div>}
    </div>
  );
}

export default QuestionBank;
