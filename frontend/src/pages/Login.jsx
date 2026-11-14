import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import { saveCandidateSession } from "../api/session";
import BrandLogo from "../components/BrandLogo";

let introPlayedInMemory = false;

function BrandMark() {
  return <span className="auth-brand-icon"><BrandLogo /></span>;
}

function EyeIcon({ visible }) {
  return visible ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 5.2A11 11 0 0 1 12 5c5 0 8.5 4.5 9.5 7a11.7 11.7 0 0 1-3.1 4.3M6.2 6.2A13 13 0 0 0 2.5 12c1 2.5 4.5 7 9.5 7a10 10 0 0 0 3.2-.5" /></svg>
    : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" /><circle cx="12" cy="12" r="2.6" /></svg>;
}

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const justSignedUp = location.state?.justSignedUp;
  const [identifier, setIdentifier] = useState(location.state?.email || "");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [remember, setRemember] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetStep, setResetStep] = useState("request");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetMessage, setResetMessage] = useState(null);
  const [showIntro, setShowIntro] = useState(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
    try { return !introPlayedInMemory && sessionStorage.getItem("interviewai-intro-seen") !== "true"; }
    catch { return !introPlayedInMemory; }
  });
  const [introExiting, setIntroExiting] = useState(false);

  useEffect(() => {
    if (!showIntro) return undefined;
    introPlayedInMemory = true;
    try { sessionStorage.setItem("interviewai-intro-seen", "true"); } catch { /* Use the in-memory guard. */ }
    const exitTimer = window.setTimeout(() => setIntroExiting(true), 3000);
    const finishTimer = window.setTimeout(() => setShowIntro(false), 3500);
    return () => { window.clearTimeout(exitTimer); window.clearTimeout(finishTimer); };
  }, [showIntro]);

  async function handleLogin(event) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { data } = await apiClient.post("/candidates/login", { email: identifier.trim(), password });
      saveCandidateSession(data.candidate_id, remember);
      try { localStorage.setItem("candidateName", data.name || ""); } catch { /* The current session remains available in memory. */ }
      navigate("/home");
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong signing in. Try again.");
      console.error(err);
    } finally { setIsSubmitting(false); }
  }

  async function requestResetCode(event) {
    event.preventDefault();
    setError(null);
    setResetMessage(null);
    setIsSubmitting(true);
    try {
      const { data } = await apiClient.post("/candidates/password-reset/request", { identifier: identifier.trim() });
      setResetMessage(data.message || "A verification code was sent.");
      setResetStep("verify");
    } catch (err) {
      setError(err.response?.data?.detail || "We couldn't send a code. Check your details and try again.");
    } finally { setIsSubmitting(false); }
  }

  async function confirmReset(event) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { data } = await apiClient.post("/candidates/password-reset/confirm", {
        identifier: identifier.trim(), code: resetCode.trim(), new_password: newPassword,
      });
      setResetMessage(data.message || "Your password has been updated. You can now sign in.");
      setResetStep("complete");
    } catch (err) {
      setError(err.response?.data?.detail || "We couldn't verify that code. Try again.");
    } finally { setIsSubmitting(false); }
  }

  async function resendResetCode() {
    setError(null);
    setResetMessage(null);
    setIsSubmitting(true);
    try {
      const { data } = await apiClient.post("/candidates/password-reset/request", { identifier: identifier.trim() });
      setResetCode("");
      setResetMessage(data.message || "A new verification code was sent.");
    } catch (err) {
      setError(err.response?.data?.detail || "We couldn't send a new code. Try again shortly.");
    } finally { setIsSubmitting(false); }
  }

  function startReset() {
    setError(null);
    setResetMessage(null);
    setResetStep("request");
    setResetCode("");
    setNewPassword("");
    setResetOpen(true);
  }

  return (
    <main className="auth-page">
      {showIntro && <div className={`brand-intro ${introExiting ? "is-exiting" : ""}`} role="status" aria-label="InterviewAI introduction">
        <div className="intro-symbol-wrap"><span className="intro-orbit orbit-a" /><span className="intro-orbit orbit-b" /><span className="intro-symbol"><BrandLogo /></span></div>
        <p className="intro-wordmark">Interview<span>AI</span></p><p className="intro-tagline">Practice smarter.<br />Interview better. Get hired.</p><span className="intro-progress" />
      </div>}
      <div className="auth-layout">
        <aside className="auth-editorial">
          <Link className="auth-brand" to="/"><BrandMark /><span>Interview<span>AI</span></span></Link>
          <div className="auth-editorial-copy">
            <span className="auth-kicker">AI-POWERED INTERVIEW COACH</span>
            <h2>Master your<br />next <em>interview.</em></h2>
            <p>Practice with realistic AI interviews and get instant actionable feedback.</p>
          </div>
        </aside>
        <section className="auth-form-side">
          <div className="auth-mobile-brand"><BrandMark /><span>Interview<span>AI</span></span></div>
          <div className="auth-card">
            {resetOpen ? <>
              <p className="auth-form-kicker">ACCOUNT RECOVERY</p><h1>{resetStep === "complete" ? "You’re back in control." : resetStep === "verify" ? "Check your messages." : "Reset your password."}</h1>
              <p className="auth-form-intro">{resetStep === "request" ? "We’ll send a one-time code to the email address or phone number on your account." : resetStep === "verify" ? "Enter the six-digit code and choose a new password." : "Your password has been updated."}</p>
              {resetStep === "request" && <form className="auth-form" onSubmit={requestResetCode}>
                <label className="auth-field" htmlFor="reset-identifier">Email or phone number<input id="reset-identifier" type="text" autoComplete="username" required value={identifier} onChange={(event) => setIdentifier(event.target.value)} className="auth-input" placeholder="Email or phone number" /><small className="auth-field-hint">Use an Indian number starting with +91, or a 10-digit mobile number.</small></label>
                {error && <p role="alert" className="auth-error">{error}</p>}
                <button type="submit" disabled={isSubmitting} className="auth-submit">{isSubmitting ? "Sending code…" : "Send verification code"}</button>
              </form>}
              {resetStep === "verify" && <form className="auth-form" onSubmit={confirmReset}>
                {resetMessage && <p role="status" className="auth-inline-success">{resetMessage}</p>}
                <label className="auth-field" htmlFor="reset-code">Verification code<input id="reset-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={resetCode} onChange={(event) => setResetCode(event.target.value)} className="auth-input" placeholder="6-digit code" /></label>
                <label className="auth-field" htmlFor="new-password">New password<input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="auth-input" placeholder="At least 8 characters" /></label>
                {error && <p role="alert" className="auth-error">{error}</p>}
                <button type="submit" disabled={isSubmitting} className="auth-submit">{isSubmitting ? "Updating password…" : "Save new password"}</button>
                <div className="auth-reset-actions"><button type="button" className="auth-text-button" disabled={isSubmitting} onClick={resendResetCode}>Resend code</button><button type="button" className="auth-text-button" onClick={() => { setResetStep("request"); setError(null); }}>Use a different email or phone</button></div>
              </form>}
              {resetStep === "complete" && <p role="status" className="auth-inline-success">{resetMessage}</p>}
              <p className="auth-switch"><button type="button" className="auth-text-button" onClick={() => { setResetOpen(false); setError(null); }}>Back to sign in</button></p>
            </> : <>
              <p className="auth-form-kicker">WELCOME BACK</p><h1>Good to see you.</h1><p className="auth-form-intro">Pick up where your preparation left off.</p>
              {justSignedUp && <p className="auth-inline-success">Account created. Sign in to get started.</p>}
              <form onSubmit={handleLogin} className="auth-form">
                <div className="auth-field auth-field--plain"><input id="email" aria-label="Email or phone number" type="text" required autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} className="auth-input" placeholder="Email or phone number" /><small className="auth-field-hint">Use an Indian number starting with +91, or a 10-digit mobile number.</small></div>
                <div className="auth-field auth-field--plain"><span className="auth-password-control"><input id="password" aria-label="Password" type={visible ? "text" : "password"} required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="auth-input" placeholder="Password" /><button type="button" className="auth-eye" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} onClick={() => setVisible((value) => !value)}><EyeIcon visible={visible} /></button></span></div>
                <div className="auth-form-options"><label className="auth-remember"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /> <span>Keep me signed in</span></label><button type="button" className="auth-text-button" onClick={startReset}>Forgot password?</button></div>
                {error && <p role="alert" className="auth-error">{error}</p>}
                <button type="submit" disabled={isSubmitting} className="auth-submit">{isSubmitting ? "Signing in…" : "Sign in"}<span aria-hidden="true">→</span></button>
              </form>
              <p className="auth-switch">New to InterviewAI? <Link to="/signup">Create an account</Link></p>
              <p className="auth-legal">By continuing, you agree to use InterviewAI responsibly and keep your account details secure.</p>
            </>}
          </div>
          <p className="auth-mobile-tagline">Practice smarter. Interview better. Get hired.</p>
        </section>
      </div>
    </main>
  );
}

export default Login;
