import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import { saveCandidateSession } from "../api/session";
import AuthLayout, { AuthFieldIcon } from "../components/AuthLayout";
import GoogleAuthButton from "../components/GoogleAuthButton";
import { productionAPIConfigured } from "../api/client";

let introPlayedInMemory = false;

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
    if (!productionAPIConfigured) {
      setError("This deployed app is missing VITE_API_BASE_URL. Add your public backend URL in Vercel and redeploy.");
      return;
    }
    setIsSubmitting(true);
    try {
      const { data } = await apiClient.post("/candidates/login", { email: identifier.trim(), password });
      saveCandidateSession(data.candidate_id, remember);
      try { localStorage.setItem("candidateName", data.name || ""); } catch { /* The current session remains available in memory. */ }
      navigate(location.state?.from || "/welcome", { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong signing in. Try again.");
      console.error(err);
    } finally { setIsSubmitting(false); }
  }



  return (
    <AuthLayout intro={showIntro && <div className={`brand-intro ${introExiting ? "is-exiting" : ""}`} role="status" aria-label="InterviewAI introduction">
        <div className="intro-symbol-wrap"><span className="intro-orbit orbit-a" /><span className="intro-orbit orbit-b" /><span className="intro-symbol"><img className="intro-logo-motion" src="/interviewai-intro.gif" alt="" aria-hidden="true" /></span></div>
        <p className="intro-wordmark">Interview<span>AI</span></p><span className="intro-progress" />
      </div>}>
      <>
              <p className="auth-form-kicker">WELCOME BACK</p><h1>Good to see you.</h1>
              {justSignedUp && <p className="auth-inline-success">Account created. Sign in to get started.</p>}
              <form onSubmit={handleLogin} className="auth-form">
                <div className="auth-field auth-field--plain"><div className="auth-input-wrap"><AuthFieldIcon name="email" /><input id="email" aria-label="Email or phone number" type="text" required autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} className="auth-input" placeholder="Email or phone number" /></div></div>
                <div className="auth-field auth-field--plain"><span className="auth-password-control auth-input-wrap"><AuthFieldIcon name="lock" /><input id="password" aria-label="Password" type={visible ? "text" : "password"} required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="auth-input" placeholder="Password" /><button type="button" className="auth-eye" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} onClick={() => setVisible((value) => !value)}><EyeIcon visible={visible} /></button></span></div>
                <div className="auth-form-options"><label className="auth-remember"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /> <span>Keep me signed in</span></label></div>
                {error && <p role="alert" className="auth-error">{error}</p>}
                <button type="submit" disabled={isSubmitting} className="auth-submit">{isSubmitting ? "Signing in…" : "Sign in"}<span aria-hidden="true">→</span></button>
              </form>
              <div className="auth-divider"><span>or continue with</span></div>
              <GoogleAuthButton remember={remember} onError={setError} onBusyChange={setIsSubmitting} />
              <p className="auth-switch">New to InterviewAI? <Link to="/signup">Create an account</Link></p>
              <p className="auth-legal">By continuing, you agree to use InterviewAI responsibly and keep your account details secure.</p>
            </>
    </AuthLayout>
  );
}

export default Login;
