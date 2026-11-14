import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import BrandLogo from "../components/BrandLogo";

function BrandMark() {
  return <span className="auth-brand-icon"><BrandLogo /></span>;
}

function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSignup(event) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await apiClient.post("/candidates", { name, email, phone_number: phoneNumber || null, password });
      navigate("/", { state: { justSignedUp: true, email } });
    } catch (err) {
      if (err.response?.status === 409) {
        setError(err.response.data.detail || "Those account details are already registered. Try signing in instead.");
      } else {
        setError("Something went wrong creating your account. Try again.");
      }
      console.error(err);
    } finally { setIsSubmitting(false); }
  }

  return (
    <main className="auth-page">
      <div className="auth-layout">
        <aside className="auth-editorial signup-editorial">
          <Link className="auth-brand" to="/"><BrandMark /><span>Interview<span>AI</span></span></Link>
          <div className="auth-editorial-copy">
            <span className="auth-kicker">GET STARTED TODAY</span>
            <h2>Prepare with<br /><em>confidence.</em></h2>
            <p>Tailored mock questions, instant evaluations, and clear paths to improvement.</p>
          </div>
        </aside>
        <section className="auth-form-side">
          <div className="auth-mobile-brand"><BrandMark /><span>Interview<span>AI</span></span></div>
          <div className="auth-card signup-card">
            <p className="auth-form-kicker">A BETTER WAY TO PREPARE</p><h1>Start with a little practice.</h1><p className="auth-form-intro">Create your account and make your next interview count.</p>
            <form onSubmit={handleSignup} className="auth-form">
              <label className="auth-field" htmlFor="name">Full name<input id="name" type="text" autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} className="auth-input" placeholder="Your name" /></label>
              <label className="auth-field" htmlFor="email">Email address<input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="auth-input" placeholder="you@example.com" /></label>
              <label className="auth-field" htmlFor="phone-number">Phone number <span className="auth-field-optional">OPTIONAL · FOR SIGN-IN & RECOVERY</span><input id="phone-number" type="tel" autoComplete="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} className="auth-input" placeholder="+91 98765 43210" /></label>
              <label className="auth-field" htmlFor="password">Password<span className="auth-password-control"><input id="password" type={visible ? "text" : "password"} autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="auth-input" placeholder="At least 8 characters" /><button type="button" className="auth-eye" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} onClick={() => setVisible((value) => !value)}><svg viewBox="0 0 24 24" aria-hidden="true">{visible ? <><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 5.2A11 11 0 0 1 12 5c5 0 8.5 4.5 9.5 7a11.7 11.7 0 0 1-3.1 4.3M6.2 6.2A13 13 0 0 0 2.5 12c1 2.5 4.5 7 9.5 7a10 10 0 0 0 3.2-.5" /></> : <><path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" /><circle cx="12" cy="12" r="2.6" /></>}</svg></button></span></label>
              {error && <p role="alert" className="auth-error">{error}</p>}
              <button type="submit" disabled={isSubmitting} className="auth-submit">{isSubmitting ? "Creating account…" : "Create account"}<span aria-hidden="true">→</span></button>
            </form>
            <p className="auth-switch">Already have an account? <Link to="/">Sign in</Link></p>
            <p className="auth-legal">Your details help personalize your interview practice and keep your account secure.</p>
          </div>
          <p className="auth-mobile-tagline">Practice smarter. Interview better. Get hired.</p>
        </section>
      </div>
    </main>
  );
}

export default Signup;
