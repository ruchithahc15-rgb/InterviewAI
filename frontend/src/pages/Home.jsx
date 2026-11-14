import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import { Icon } from "../components/AppShell";
import { getCandidateId } from "../api/session";

function Home() {
  const navigate = useNavigate();
  const [trendRange, setTrendRange] = useState(5);
  const candidateId = Number(getCandidateId());
  const [candidate, setCandidate] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [interviewResults, setInterviewResults] = useState([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [candidateRes, interviewsRes, questionsRes, responsesRes, evaluationsRes, resultsRes] = await Promise.all([
          apiClient.get(`/candidates/${candidateId}`),
          apiClient.get("/interviews"),
          apiClient.get("/questions"),
          apiClient.get("/responses"),
          apiClient.get("/evaluations"),
          apiClient.get("/interview-results"),
        ]);
        const mine = interviewsRes.data.filter((item) => item.candidate_id === candidateId);
        const mineIds = new Set(mine.map((item) => item.id));
        setCandidate(candidateRes.data);
        setInterviews(mine.sort((a, b) => b.id - a.id));
        const mineQuestions = questionsRes.data.filter((question) => mineIds.has(question.interview_id));
        setQuestions(mineQuestions);
        setQuestionCount(mineQuestions.length);
        const mineQuestionIds = new Set(mineQuestions.map((question) => question.id));
        const mineResponseIds = new Set(responsesRes.data.filter((response) => mineQuestionIds.has(response.question_id)).map((response) => response.id));
        const mineResponses = responsesRes.data.filter((response) => mineQuestionIds.has(response.question_id));
        const mineEvaluations = evaluationsRes.data.filter((evaluation) => mineResponseIds.has(evaluation.response_id));
        setResponses(mineResponses);
        setEvaluations(mineEvaluations);
        setInterviewResults(resultsRes.data.filter((result) => mineIds.has(result.interview_id)));
        try { localStorage.setItem("candidateName", candidateRes.data.name || ""); } catch { /* Dashboard data still loads when storage is unavailable. */ }
      } catch (error) {
        console.error(error);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [candidateId]);

  const completedCount = interviews.filter((interview) => interview.status === "completed").length;
  const latestInterview = interviews[0];
  const latestQuestions = latestInterview ? questions.filter((question) => question.interview_id === latestInterview.id) : [];
  const latestHref = latestInterview?.status === "completed" ? "/results" : latestQuestions.length ? "/interview" : "/interviews";
  const latestResult = [...interviewResults].sort((a, b) => new Date(b.time_created) - new Date(a.time_created))[0];
  const latestResultInterview = latestResult ? interviews.find((interview) => interview.id === latestResult.interview_id) : null;
  const stats = [
    { label: "Interviews", value: loading ? "—" : interviews.length, note: "Practice sessions created", icon: "file", tone: "blue" },
    { label: "Questions", value: loading ? "—" : questionCount, note: "Tailored to your target role", icon: "stack", tone: "green" },
    { label: "Feedback reports", value: loading ? "—" : interviewResults.length, note: "One report per completed session", icon: "chart", tone: "violet" },
    { label: "Interviews completed", value: loading ? "—" : completedCount, note: "Every session moves you forward", icon: "clock", tone: "orange" },
  ];

  return (
    <div className="dashboard-grid">
      <section className="dashboard-primary">
        <div className="welcome-banner">
          <div className="welcome-copy">
            <span className="welcome-kicker"><span className="welcome-dot" /> WELCOME BACK{candidate?.name ? `, ${candidate.name.split(" ")[0].toUpperCase()}` : ""}</span>
            <h2>Your next opportunity<br /><span>starts with practice.</span></h2>
            <p>Build confidence with focused mock interviews, realistic questions, and feedback that helps you improve.</p>
          </div>
          <div className="welcome-art" aria-hidden="true"><div className="art-glow" /><div className="art-window"><div className="art-window-top"><i /><i /><i /></div><div className="art-code">&lt;/&gt;</div><span className="art-line line-one" /><span className="art-line line-two" /></div><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><span className="art-spark spark-one">✦</span><span className="art-spark spark-two">✧</span></div>
        </div>

        <section className="stats-grid" aria-label="Your practice at a glance">
          {stats.map((stat) => <article className="stat-card" key={stat.label}><span className={`stat-icon ${stat.tone}`}><Icon name={stat.icon} size={20} /></span><span className="stat-value">{stat.value}</span><span className="stat-label">{stat.label}</span><span className="stat-note">{stat.note}</span></article>)}
        </section>

        <section className="panel dashboard-performance">
          <div className="panel-heading"><div><h2>Performance history</h2><p>Average interview scores calculated from your AI evaluations.</p></div><div className="trend-controls" aria-label="Choose score range">{[5, 10].map((count) => <button key={count} type="button" className={trendRange === count ? "selected" : ""} onClick={() => setTrendRange(count)}>Last {count} sessions</button>)}</div></div>
          {(() => {
            const scored = [...interviewResults].filter((item) => Number.isFinite(Number(item.total_score))).sort((a, b) => new Date(a.time_created) - new Date(b.time_created)).slice(-trendRange);
            if (!scored.length) return <div className="dashboard-chart-empty"><span className="stat-icon green"><Icon name="chart" size={21} /></span><div><strong>Your score story starts with feedback</strong><p>Complete a practice interview to see your results plotted here.</p></div><Link to="/interviews" className="text-link">View interviews <Icon name="arrow" size={15} /></Link></div>;
            const chartWidth = 620, chartHeight = 180, left = 44, right = 24, top = 20, bottom = 32;
            const x = (index) => left + (scored.length === 1 ? (chartWidth - left - right) / 2 : index * (chartWidth - left - right) / (scored.length - 1));
            const y = (value) => top + (100 - Number(value)) * (chartHeight - top - bottom) / 100;
            const path = scored.map((item, i) => `${i ? "L" : "M"} ${x(i)} ${y(item.total_score)}`).join(" ");
            return <div className="dashboard-chart-wrap"><svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="dashboard-chart" role="img" aria-label="Recent interview feedback scores"><defs><linearGradient id="score-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#25c6b0" stopOpacity=".25"/><stop offset="100%" stopColor="#25c6b0" stopOpacity="0.02"/></linearGradient></defs>{[0, 50, 100].map((tick) => <g key={tick}><line x1={left} x2={chartWidth - right} y1={y(tick)} y2={y(tick)} className="chart-gridline"/><text x={left - 8} y={y(tick) + 4} textAnchor="end" className="chart-label">{tick}</text></g>)}{scored.length > 1 && <path d={`${path} L ${x(scored.length - 1)} ${chartHeight - bottom} L ${x(0)} ${chartHeight - bottom} Z`} fill="url(#score-fill)"/>}{scored.length > 1 && <path d={path} className="trend-line"/>}{scored.map((item, i) => <g key={item.id} className="dashboard-chart-point" role="button" tabIndex="0" aria-label={`Score ${item.total_score}, open feedback`} onClick={() => navigate("/results", { state: { interviewId: item.interview_id } })} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); navigate("/results", { state: { interviewId: item.interview_id } }); } }}><circle cx={x(i)} cy={y(item.total_score)} r="13" className="chart-point-hit"/><circle cx={x(i)} cy={y(item.total_score)} r="5.5" className="trend-point"/><text x={x(i)} y={y(item.total_score) - 9} textAnchor="middle" className="chart-label font-bold" fill="#142238">{item.total_score}</text><text x={x(i)} y={chartHeight - 6} textAnchor="middle" className="chart-label">{new Date(item.time_created).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</text><title>{item.total_score} / 100 · Open report</title></g>)}</svg><span className="chart-hint">Select any score node to view full evaluation feedback</span></div>;
          })()}
        </section>

        <section className="panel recent-panel timeline-panel">
          <div className="panel-heading"><div><h2>Practice timeline</h2><p>A closer look at the steps behind each session.</p></div><Link to="/interviews" className="text-link">View history <Icon name="arrow" size={16} /></Link></div>
          {loadError ? <div className="empty-state"><h3>Your timeline is unavailable</h3><p>Check your connection to the interview service and refresh to try again.</p><button className="button-secondary" onClick={() => window.location.reload()}>Refresh dashboard</button></div> : loading ? <div className="loading-state"><span className="loading-spinner" />Loading your practice history…</div> : interviews.length === 0 ? <div className="empty-state"><span className="empty-icon"><Icon name="file" size={26} /></span><h3>Your story starts with one interview</h3><p>Create a focused practice session and get questions tailored to your role.</p><Link to="/create" className="button-primary">Create your first interview <Icon name="arrow" size={17} /></Link></div> : <div className="activity-timeline">{interviews.slice(0, 4).map((interview) => {
            const interviewQuestions = questions.filter((question) => question.interview_id === interview.id);
            const questionIds = new Set(interviewQuestions.map((question) => question.id));
            const interviewResponses = responses.filter((response) => questionIds.has(response.question_id));
            const answered = interviewResponses.filter((response) => response.answer?.trim()).length;
            const responseIds = new Set(interviewResponses.map((response) => response.id));
            const scored = evaluations.filter((evaluation) => responseIds.has(evaluation.response_id)).length;
            const complete = interview.status === "completed";
            return <article className="activity-session" key={interview.id}>
              <div className="activity-session-head"><span className="activity-session-marker"><Icon name="file" size={17} /></span><div className="activity-session-title"><span>SESSION {String(interview.id).padStart(2, "0")}</span><h3>{interview.role}</h3><p>{interview.company}{interview.created_at ? ` · ${new Date(interview.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}` : ""}</p></div><span className={`status-pill ${complete ? "complete" : "progress"}`}>{complete ? "Completed" : "In progress"}</span></div>
              <div className="activity-steps">
                <div className="activity-step done"><span className="activity-step-node">✓</span><div><strong>Practice created</strong><small>Interview plan saved for {interview.role}</small></div></div>
                <span className={`activity-step-connector ${interviewQuestions.length ? "filled" : ""}`} />
                <div className={`activity-step ${interviewQuestions.length ? "done" : "current"}`}><span className="activity-step-node">{interviewQuestions.length ? "✓" : "2"}</span><div><strong>Questions prepared</strong><small>{interviewQuestions.length ? interviewQuestions.length + " role-specific questions ready" : "Question generation in progress"}</small></div></div>
                <span className={`activity-step-connector ${complete ? "filled" : ""}`} />
                <div className={`activity-step ${complete ? "done" : "current"}`}><span className="activity-step-node">{complete ? "✓" : "3"}</span><div><strong>{complete ? "Interview completed" : "Practice in progress"}</strong><small>{complete ? answered + " answers · " + scored + " feedback notes" : answered + " of " + interviewQuestions.length + " answers saved"}</small></div></div>
              </div>
            </article>;
          })}</div>}
        </section>
      </section>

      <aside className="dashboard-aside">
        <section className="goal-card latest-report-card"><div className="goal-top"><span className="goal-icon"><Icon name="chart" size={20} /></span><span>{latestResult ? "LATEST FEEDBACK" : "YOUR NEXT MILESTONE"}</span></div>{latestResult && latestResultInterview ? <><div className="latest-report-main"><span className="latest-report-donut" style={{ "--report-score": latestResult.total_score + "%" }}><strong>{latestResult.total_score}</strong><small>OUT OF 100</small></span><span className="latest-report-copy"><strong>{latestResultInterview.role}</strong><small>{latestResultInterview.company}</small><small>{new Date(latestResult.time_created).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</small></span></div><Link to="/results" state={{ interviewId: latestResultInterview.id }} className="text-link">Review this report <Icon name="arrow" size={16} /></Link></> : <><h2>Your first feedback report.</h2><p>Complete one practice interview to see your score and skill breakdown here.</p></>}<span className="goal-decoration" aria-hidden="true">✦</span></section>
        <section className="panel quick-panel"><div className="panel-heading compact"><h2>Pick up where you left off</h2><span className="heading-icon"><Icon name="clock" size={18} /></span></div>{latestInterview ? <div className="quick-actions"><Link to={latestHref} state={{ interviewId: latestInterview.id, questions: latestQuestions }} className="quick-action"><span className="quick-icon orange"><Icon name={latestInterview.status === "completed" ? "chart" : "clock"} /></span><span><strong>{latestInterview.role}</strong><small>{latestInterview.status === "completed" ? "Review this interview’s feedback" : "Continue your latest session"}</small></span><Icon name="arrow" size={16} /></Link></div> : <p className="quick-empty">Your recent sessions will appear here when you start practicing.</p>}</section>
        <section className="panel progress-panel"><div className="panel-heading compact"><h2>Your momentum</h2><span className="heading-icon"><Icon name="chart" size={18} /></span></div><div className="momentum-number">{completedCount}<span> sessions completed</span></div><p>Every answer is a chance to get sharper. Keep your momentum going.</p><div className="momentum-track"><span style={{ width: Math.min(100, completedCount / 5 * 100) + "%" }} /></div><small className="momentum-caption">{completedCount < 5 ? `${5 - completedCount} more to reach your first five sessions` : "Five sessions completed — keep building your practice"}</small></section>
      </aside>
      <Link to="/create" className="floating-create-button"><span className="float-plus"><Icon name="plus" size={21} /></span><span>Create interview<small>Build a practice session</small></span><Icon name="arrow" size={17} /></Link>
    </div>
  );
}

export default Home;
