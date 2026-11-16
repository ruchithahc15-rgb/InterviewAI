import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import { Icon } from "../components/AppShell";
import { clearCandidateSession, getCandidateId } from "../api/session";
import { printInterviewPdf, saveInterviewDoc } from "../utils/exportInterview";

function Profile() {
  const navigate = useNavigate();
  const candidateId = Number(getCandidateId());
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(() => {
    try { return localStorage.getItem(`interviewai:avatar:${candidateId}`) || ""; } catch { return ""; }
  });
  const [interviews, setInterviews] = useState([]);
  const [results, setResults] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [interviewToDelete, setInterviewToDelete] = useState(null);
  const [deletingInterview, setDeletingInterview] = useState(false);

  useEffect(() => {
    Promise.all([
      apiClient.get("/candidates/" + candidateId),
      apiClient.get("/interviews"),
      apiClient.get("/interview-results"),
      apiClient.get("/questions"),
      apiClient.get("/responses"),
    ])
      .then(([candidateResponse, interviewsResponse, resultsResponse, questionsResponse, responsesResponse]) => {
        const data = candidateResponse.data;
        setName(data.name || ""); setEmail(data.email || ""); setPhoneNumber(data.phone_number || "");
        const mine = interviewsResponse.data.filter((item) => item.candidate_id === candidateId);
        const mineIds = new Set(mine.map((item) => item.id));
        setInterviews(mine);
        setResults(resultsResponse.data.filter((result) => mineIds.has(result.interview_id)));
        setQuestions(questionsResponse.data.filter((question) => mineIds.has(question.interview_id)));
        const mineQuestionIds = new Set(questionsResponse.data.filter((question) => mineIds.has(question.interview_id)).map((question) => question.id));
        setResponses(responsesResponse.data.filter((response) => mineQuestionIds.has(response.question_id)));
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
      window.dispatchEvent(new Event("interviewai:profile-change"));
      setNotice("Your profile has been updated.");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "We couldn't save those changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }


  function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file for your profile photo.");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      try {
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        localStorage.setItem(`interviewai:avatar:${candidateId}`, dataUrl);
        setAvatarUrl(dataUrl);
        window.dispatchEvent(new Event("interviewai:profile-change"));
        setError(null);
        setNotice("Profile photo updated on this device.");
      } catch {
        setError("This image could not be saved. Try a smaller photo.");
      }
    };
    image.onerror = () => { URL.revokeObjectURL(objectUrl); setError("This image could not be opened."); };
    image.src = objectUrl;
    event.target.value = "";
  }

  function logout() {
    clearCandidateSession();
    navigate("/", { replace: true });
  }

  async function deleteInterview() {
    if (!interviewToDelete) return;
    setDeletingInterview(true);
    try {
      await apiClient.delete(`/interviews/${interviewToDelete.id}`);
      const deletedQuestionIds = new Set(questions.filter((question) => question.interview_id === interviewToDelete.id).map((question) => question.id));
      setInterviews((current) => current.filter((item) => item.id !== interviewToDelete.id));
      setQuestions((current) => current.filter((item) => item.interview_id !== interviewToDelete.id));
      setResponses((current) => current.filter((item) => !deletedQuestionIds.has(item.question_id)));
      setResults((current) => current.filter((item) => item.interview_id !== interviewToDelete.id));
      setNotice("Interview and its saved practice data were deleted.");
      setInterviewToDelete(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "We couldn't delete this interview. Please try again.");
      setInterviewToDelete(null);
    } finally {
      setDeletingInterview(false);
    }
  }

  function exportDataFor(interview) {
    const interviewQuestions = questions.filter((question) => question.interview_id === interview.id).map((question) => ({
      ...question,
      answer: responses.find((response) => response.question_id === question.id)?.answer,
    }));
    return { interview, candidate: { name, email, phone_number: phoneNumber }, questions: interviewQuestions };
  }

  return (
    <div className="profile-layout">
      <section className="panel profile-card">
        <div className="profile-banner"><div className="profile-photo-control"><div className="profile-avatar" role={avatarUrl ? "img" : undefined} aria-label={avatarUrl ? `${name || "Your"} profile photo` : undefined}>{avatarUrl ? <img className="profile-avatar-image" src={avatarUrl} alt="" /> : (name ? name[0].toUpperCase() : "C")}</div><label className="profile-photo-button" htmlFor="profile-photo" aria-label={avatarUrl ? "Change profile photo" : "Add profile photo"}><Icon name="plus" size={17} /></label><input id="profile-photo" className="visually-hidden" type="file" accept="image/*" onChange={handlePhotoChange} /></div><div><h2>{name || "Your profile"}</h2></div></div>
        {loading ? <div className="loading-state"><span className="loading-spinner" />Loading account details…</div> : <form className="profile-form" onSubmit={saveProfile}><div className="profile-section-title"><h3>Personal details</h3></div><label htmlFor="profile-name">Full name<input id="profile-name" required value={name} onChange={(event) => setName(event.target.value)} /></label><label htmlFor="profile-email">Email address<input id="profile-email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label htmlFor="profile-phone">Phone number<input id="profile-phone" type="tel" autoComplete="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="Add phone number" /></label>{error && <p role="alert" className="form-error">{error}</p>}{notice && <p role="status" className="form-success">{notice}</p>}<div className="profile-actions"><button className="button-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"} <Icon name="arrow" size={17} /></button></div></form>}
        <div className="profile-session-actions"><div><h3>Sign out</h3><p>End your current session on this device.</p></div><button type="button" className="logout-danger" onClick={() => setShowLogoutModal(true)}><Icon name="logout" size={17} />Log out</button></div>
      </section>
      <aside className="panel profile-history"><div className="profile-history-heading"><div><span className="eyebrow teal-eyebrow">YOUR PRACTICE RECORD</span><h3>Interview history</h3></div><span className="profile-history-total">{interviews.filter((interview) => interview.status === "completed").length}<small> completed</small></span></div>{notice && <p role="status" className="form-success">{notice}</p>}{loading ? <div className="loading-state">Loading your history…</div> : interviews.length ? <div className="profile-history-list">{[...interviews].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0) || b.id - a.id).map((interview) => {
        const result = results.find((item) => item.interview_id === interview.id);
        const timestamp = result?.time_created || interview.created_at;
        const interviewExport = exportDataFor(interview);
        return <article className="profile-history-entry" key={interview.id}><div className="profile-history-row">{result ? <Link className="profile-history-open" to="/results" state={{ interviewId: interview.id }}><span className="profile-history-marker has-score"><Icon name="chart" size={17} /></span><span className="profile-history-copy"><strong>{interview.role}</strong><small>{interview.company} · {timestamp ? new Date(timestamp).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Date unavailable"}</small></span><span className="profile-history-status scored">{result.total_score} / 100</span></Link> : <div className="profile-history-open"><span className="profile-history-marker"><Icon name="file" size={17} /></span><span className="profile-history-copy"><strong>{interview.role}</strong><small>{interview.company} · {timestamp ? new Date(timestamp).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Date unavailable"}</small></span><span className="profile-history-status">{interview.status === "completed" ? "Feedback pending" : "In progress"}</span></div>}</div><div className="profile-history-tools"><button type="button" className="history-pdf-button" aria-label="Save interview as PDF" onClick={() => printInterviewPdf(interviewExport)}><Icon name="download" size={15} /><span>Save PDF</span></button><button type="button" className="history-doc-button" aria-label="Save interview as a Word document" onClick={() => saveInterviewDoc(interviewExport)}><Icon name="download" size={15} /><span>Save DOC</span></button><button type="button" className="history-delete-button" aria-label="Delete interview" onClick={() => setInterviewToDelete(interview)}><Icon name="trash" size={15} /><span>Delete</span></button></div></article>;
      })}</div> : <div className="empty-state profile-history-empty"><h3>No interviews yet</h3></div>}</aside>

      {interviewToDelete && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-interview-title"><div className="modal-card"><div className="modal-icon warning"><Icon name="file" size={24} /></div><h3 id="delete-interview-title">Delete this interview?</h3><p>This removes “{interviewToDelete.role}” and its saved questions, answers, and feedback.</p><div className="modal-actions"><button type="button" className="button-secondary" disabled={deletingInterview} onClick={() => setInterviewToDelete(null)}>Keep interview</button><button type="button" className="button-danger" disabled={deletingInterview} onClick={deleteInterview}>{deletingInterview ? "Deleting…" : "Delete interview"}</button></div></div></div>}

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
