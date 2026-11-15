import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../api/client";
import { Icon } from "../components/AppShell";
import { getCandidateId } from "../api/session";

function Home() {
  const candidateId = Number(getCandidateId());
  const [candidate, setCandidate] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [interviewResults, setInterviewResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [candidateRes, interviewsRes, questionsRes, resultsRes] = await Promise.all([
          apiClient.get(`/candidates/${candidateId}`),
          apiClient.get("/interviews"),
          apiClient.get("/questions"),
          apiClient.get("/interview-results"),
        ]);
        const mine = interviewsRes.data.filter((item) => item.candidate_id === candidateId);
        const mineIds = new Set(mine.map((item) => item.id));
        setCandidate(candidateRes.data);
        setInterviews(mine);
        setQuestionCount(questionsRes.data.filter((question) => mineIds.has(question.interview_id)).length);
        setInterviewResults(resultsRes.data.filter((result) => mineIds.has(result.interview_id)));
        try { localStorage.setItem("candidateName", candidateRes.data.name || ""); } catch { /* Dashboard data remains available when storage is disabled. */ }
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
  const latestResult = [...interviewResults].sort((a, b) => new Date(b.time_created) - new Date(a.time_created))[0];
  const latestInterview = latestResult ? interviews.find((interview) => interview.id === latestResult.interview_id) : null;
  const stats = [
    { label: "Interviews", value: loading ? "—" : interviews.length, icon: "file", tone: "blue" },
    { label: "Questions", value: loading ? "—" : questionCount, icon: "stack", tone: "green" },
    { label: "Feedback reports", value: loading ? "—" : interviewResults.length, icon: "chart", tone: "violet" },
    { label: "Interviews completed", value: loading ? "—" : completedCount, icon: "clock", tone: "orange" },
  ];
  const firstName = candidate?.name?.trim().split(/\s+/)[0];

  return (
    <div className="dashboard-home">
      <section className="dashboard-hero-card">
        <div className="dashboard-hero-copy">
          <span className="welcome-kicker"><span className="welcome-dot" /> INTERVIEWAI PRACTICE SPACE</span>
          <h2>{firstName ? `Welcome back, ${firstName}.` : "Welcome back."}</h2>
          {loadError && <p className="dashboard-load-error" role="alert">Your latest activity could not be loaded. Refresh to try again.</p>}
        </div>
        <div className="dashboard-hero-visual" aria-hidden="true"><span className="hero-orbit hero-orbit-one" /><span className="hero-orbit hero-orbit-two" /><span className="hero-play-orb"><Icon name="play" size={34} /></span><span className="hero-glass-chip chip-top"><Icon name="sparkle" size={15} /></span><span className="hero-glass-chip chip-bottom"><Icon name="chart" size={16} /></span></div>
        <aside className="dashboard-hero-glass">
          <div className="hero-glass-heading"><span><Icon name="chart" size={18} /></span><small>{latestResult ? "LATEST FEEDBACK" : "YOUR FEEDBACK"}</small></div>
          {latestResult && latestInterview ? <>
            <div className="hero-score-row"><span className="hero-score-donut" style={{ "--report-score": `${latestResult.total_score}%` }}><strong>{latestResult.total_score}</strong></span><div><strong>{latestInterview.role}</strong><small>{latestInterview.company}</small><small>{new Date(latestResult.time_created).toLocaleDateString(undefined, { dateStyle: "medium" })}</small></div></div>
            <Link to="/results" state={{ interviewId: latestInterview.id }} className="hero-report-link">Open feedback <Icon name="arrow" size={15} /></Link>
          </> : <div className="hero-no-report"><strong>{loading ? "Loading your feedback" : "No report yet"}</strong><small>{loading ? "Your saved results will appear here." : "Complete an interview to see your feedback."}</small></div>}
        </aside>
      </section>

      <section className="stats-grid dashboard-stats" aria-label="Your practice at a glance">
        {stats.map((stat) => <article className="stat-card" key={stat.label}><span className={`stat-icon ${stat.tone}`}><Icon name={stat.icon} size={20} /></span><span className="stat-value">{stat.value}</span><span className="stat-label">{stat.label}</span></article>)}
      </section>
    </div>
  );
}

export default Home;
