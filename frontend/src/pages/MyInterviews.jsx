import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import apiClient from "../api/client";
import { Icon } from "../components/AppShell";
import { getCandidateId } from "../api/session";

function MyInterviews() {
  const candidateId = Number(getCandidateId());
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [interviews, setInterviews] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const query = searchParams.get("q") || "";

  useEffect(() => {
    async function load() {
      try {
        const [interviewsRes, questionsRes] = await Promise.all([apiClient.get("/interviews"), apiClient.get("/questions")]);
        setInterviews(interviewsRes.data.filter((item) => item.candidate_id === candidateId).sort((a, b) => b.id - a.id));
        setQuestions(questionsRes.data);
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [candidateId]);

  const filtered = useMemo(() => interviews.filter((interview) => {
    const matchesFilter = filter === "All" || (filter === "In progress" ? interview.status !== "completed" : interview.status === "completed");
    const questionText = questions.filter((item) => item.interview_id === interview.id).map((item) => item.question).join(" ");
    const searchable = `${interview.company} ${interview.role} ${questionText}`.toLowerCase();
    const matchesQuery = !query || searchable.includes(query.toLowerCase());
    return matchesFilter && matchesQuery;
  }), [interviews, questions, filter, query]);

  function continueInterview(interview) {
    const interviewQuestions = questions.filter((question) => question.interview_id === interview.id);
    if (interview.status === "completed") {
      navigate("/results", { state: { interviewId: interview.id } });
    } else if (interviewQuestions.length) {
      navigate("/interview", { state: { interviewId: interview.id, questions: interviewQuestions } });
    } else {
      navigate("/create");
    }
  }

  return (
    <div className="content-column">
      <div className="list-intro"><div><h2>Interview history</h2></div><button className="button-primary" onClick={() => navigate("/create")}>Create interview <Icon name="arrow" size={17} /></button></div>
      <section className="panel library-panel">
        <div className="library-toolbar"><div className="filter-switch" role="tablist" aria-label="Filter interviews">{["All", "In progress", "Completed"].map((item) => <button key={item} role="tab" aria-selected={filter === item} className={filter === item ? "selected" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div><span className="result-count">{filtered.length} {filtered.length === 1 ? "session" : "sessions"}</span></div>
        {loading ? <div className="loading-state"><span className="loading-spinner" />Loading your interviews…</div> : error ? <div className="empty-state"><h3>Could not load your interviews</h3><p>Please check your connection and try again.</p></div> : filtered.length === 0 ? <div className="empty-state"><span className="empty-icon"><Icon name="file" size={26} /></span><h3>{query ? "No matching interviews" : "Nothing here just yet"}</h3><p>{query ? "Try another search term." : "Create your first practice session and your interview history will appear here."}</p>{!query && <button className="button-primary" onClick={() => navigate("/create")}>Create an interview <Icon name="arrow" size={17} /></button>}</div> : <div className="library-list">{filtered.map((interview) => <article className="library-row" key={interview.id}><div className="library-avatar"><Icon name="file" size={20} /></div><div className="library-info"><h3>{interview.role}</h3><p>{interview.company}</p><div className="library-meta"><span><Icon name="stack" size={14} /> {questions.filter((question) => question.interview_id === interview.id).length} questions</span><span className={"status-pill " + (interview.status === "completed" ? "complete" : "progress")}>{interview.status === "completed" ? "Completed" : "In progress"}</span></div></div><button className="button-secondary row-action" onClick={() => continueInterview(interview)}>{interview.status === "completed" ? "View feedback" : "Continue"} <Icon name="arrow" size={16} /></button></article>)}</div>}
      </section>
    </div>
  );
}

export default MyInterviews;
