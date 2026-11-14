import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import { Icon } from "../components/AppShell";
import { clearCandidateSession, getCandidateId } from "../api/session";

function Profile() {
  const navigate = useNavigate();
  const candidateId = Number(getCandidateId());
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [interviews, setInterviews] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    Promise.all([
      apiClient.get("/candidates/" + candidateId),
      apiClient.get("/interviews"),
      apiClient.get("/interview-results"),
    ])
      .then(([candidateResponse, interviewsResponse, resultsResponse]) => {
        const data = candidateResponse.data;
        setName(data.name || ""); setEmail(data.email || ""); setPhoneNumber(data.phone_number || "");
        const mine = interviewsResponse.data.filter((item) => item.candidate_id === candidateId);
        const mineIds = new Set(mine.map((item) => item.id));
        setInterviews(mine);
        setResults(resultsResponse.data.filter((result) => mineIds.has(result.interview_id)));
      })
      .catch((err) => { console.error(err); setError("We couldn't load your account details and practice history."); })
      .finally(() => setLoading(false));
  }, [candidateId]);

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      const { data } = await apiClient.put("/candidates/" + candidateId, { name: name.trim(), email: email.trim(), phone_number: phoneNumber.trim() || null });
      setName(data.name);
      setEmail(data.email);
      setPhoneNumber(data.phone_number || "");
      localStorage.setItem("candidateName", data.name);
      setNotice("Your profile has been updated.");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "We couldn't save those changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    clearCandidateSession();
    navigate("/", { replace: true });
  }

  return (
    <div className="profile-layout">
      <section className="panel profile-card">
        <div className="profile-banner"><div className="profile-avatar">{name ? name[0].toUpperCase() : "C"}</div><div><h2>{name || "Your profile"}</h2><p>InterviewAI member</p></div></div>
        {loading ? <div className="loading-state"><span className="loading-spinner" />Loading account details…</div> : <form className="profile-form" onSubmit={saveProfile}><div className="profile-section-title"><h3>Personal details</h3><p>Keep your details up to date for a more personal experience.</p></div><label htmlFor="profile-name">Full name<input id="profile-name" required value={name} onChange={(event) => setName(event.target.value)} /></label><label htmlFor="profile-email">Email address<input id="profile-email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label htmlFor="profile-phone">Phone number<input id="profile-phone" type="tel" autoComplete="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="+91 98765 43210" /></label>{error && <p role="alert" className="form-error">{error}</p>}{notice && <p role="status" className="form-success">{notice}</p>}<div className="profile-actions"><button className="button-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"} <Icon name="arrow" size={17} /></button></div></form>}
        <div className="profile-session-actions"><div><h3>Sign out</h3><p>End your current session on this device.</p></div><button type="button" className="logout-danger" onClick={() => setShowLogoutModal(true)}><Icon name="logout" size={17} />Log out</button></div>
      </section>
      <aside className="panel profile-history"><div className="profile-history-heading"><div><span className="eyebrow teal-eyebrow">YOUR PRACTICE RECORD</span><h3>Interview history</h3></div><span className="profile-history-total">{interviews.filter((interview) => interview.status === "completed").length}<small> completed</small></span></div>{loading ? <div className="loading-state">Loading your history…</div> : interviews.length ? <div className="profile-history-list">{[...interviews].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0) || b.id - a.id).map((interview) => {
        const result = results.find((item) => item.interview_id === interview.id);
        const timestamp = result?.time_created || interview.created_at;
        const row = <><span className={`profile-history-marker ${result ? "has-score" : ""}`}><Icon name={result ? "chart" : "file"} size={17} /></span><span className="profile-history-copy"><strong>{interview.role}</strong><small>{interview.company} · {timestamp ? new Date(timestamp).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Date unavailable"}</small></span><span className={`profile-history-status ${result ? "scored" : ""}`}>{result ? `${result.total_score} / 100` : interview.status === "completed" ? "Feedback pending" : "In progress"}</span></>;
        return result ? <Link className="profile-history-row" key={interview.id} to="/results" state={{ interviewId: interview.id }}>{row}</Link> : <article className="profile-history-row" key={interview.id}>{row}</article>;
      })}</div> : <div className="empty-state profile-history-empty"><h3>Your history starts here</h3><p>Completed practice interviews and their scores will appear in this list.</p></div>}</aside>

      {showLogoutModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="profile-logout-title">
          <div className="modal-card">
            <div className="modal-icon warning">
              <Icon name="logout" size={24} />
            </div>
            <h3 id="profile-logout-title">Sign out of InterviewAI?</h3>
            <p>You’ll need to sign back in with your credentials to access your saved interviews, evaluations, and progress.</p>
            <div className="modal-actions">
              <button type="button" className="button-secondary" onClick={() => setShowLogoutModal(false)}>
                Stay signed in
              </button>
              <button type="button" className="button-danger" onClick={logout}>
                Yes, sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
