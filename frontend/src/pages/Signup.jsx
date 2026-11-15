import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import AuthLayout, { AuthFieldIcon } from "../components/AuthLayout";
import GoogleAuthButton from "../components/GoogleAuthButton";

function suggestPassword() {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%&*?"];
  const pool = sets.join("");
  const random = crypto.getRandomValues(new Uint8Array(18));
  const value = sets.map((set, index) => set[random[index] % set.length]).concat(
    Array.from(random.slice(4), (byte) => pool[byte % pool.length]),
  );
  for (let index = value.length - 1; index > 0; index -= 1) {
    const swap = random[(index + 4) % random.length] % (index + 1);
    [value[index], value[swap]] = [value[swap], value[index]];
  }
  return value.join("");
}

function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState("details");
  const [emailCode, setEmailCode] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");

  async function requestVerification(identifier) {
    const { data } = await apiClient.post("/candidates/verification/request", { identifier });
    setVerificationMessage(data.message || "A verification code was sent.");
  }

  async function handleSignup(event) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await apiClient.post("/candidates", { name, email, phone_number: phoneNumber || null, password });
      setStep("verify");
      setEmailVerified(false);
      setPhoneVerified(!phoneNumber);
      try {
        await requestVerification(email);
        if (phoneNumber) await requestVerification(phoneNumber);
      } catch (deliveryError) {
        setError(deliveryError.response?.data?.detail || "Your account was created, but we couldn't send the verification code. Use resend after checking the delivery setup.");
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setError(err.response.data.detail || "Those account details are already registered. Try signing in instead.");
      } else {
        setError(err.response?.data?.detail || "Something went wrong creating your account. Check your details and try again.");
      }
      console.error(err);
    } finally { setIsSubmitting(false); }
  }

  async function confirmVerification(identifier, code, channel) {
    setError(null);
    setVerificationMessage("");
    setIsSubmitting(true);
    try {
      const { data } = await apiClient.post("/candidates/verification/confirm", { identifier, code: code.trim() });
      const verifiedEmail = data.email_verified;
      const verifiedPhone = data.phone_verified;
      setEmailVerified(verifiedEmail);
      setPhoneVerified(verifiedPhone);
      setVerificationMessage(data.message);
      if (verifiedEmail && (!phoneNumber || verifiedPhone)) navigate("/", { state: { justSignedUp: true, email } });
      else if (channel === "email" && phoneNumber) setVerificationMessage("Email verified. Verify your mobile number to complete account setup.");
    } catch (verificationError) {
      setError(verificationError.response?.data?.detail || "That code couldn't be verified. Check it and try again.");
    } finally { setIsSubmitting(false); }
  }

  function handleSuggestPassword() {
    try {
      setPassword(suggestPassword());
      setVisible(true);
      setPasswordNotice("A strong password is ready. Save it somewhere secure before continuing.");
    } catch {
      setError("Password suggestions need a secure browser context. Enter your own strong password instead.");
    }
  }

  return (
    <AuthLayout isSignup>
      {step === "details" ? <><p className="auth-form-kicker">CREATE YOUR ACCOUNT</p>
      <h1>Start with a little practice.</h1>
      <form onSubmit={handleSignup} className="auth-form signup-form">
        <div className="auth-field auth-field--plain"><div className="auth-input-wrap"><AuthFieldIcon name="person" /><input id="signup-name" aria-label="Full name" type="text" autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} className="auth-input" placeholder="Your name" /></div></div>
        <div className="auth-field auth-field--plain"><div className="auth-input-wrap"><AuthFieldIcon name="email" /><input id="signup-email" aria-label="Email address" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="auth-input" placeholder="Email address" /></div></div>
        <div className="auth-field auth-field--plain"><div className="auth-input-wrap"><AuthFieldIcon name="phone" /><input id="signup-phone" aria-label="Phone number, optional" type="tel" autoComplete="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} className="auth-input" placeholder="+91 xxxxxxxxxx" /></div></div>
        <div className="auth-field auth-field--plain"><span className="auth-password-control auth-input-wrap"><AuthFieldIcon name="lock" /><input id="signup-password" aria-label="Password" type={visible ? "text" : "password"} autoComplete="new-password" required minLength={8} value={password} onChange={(event) => { setPassword(event.target.value); setPasswordNotice(""); }} className="auth-input" placeholder="Create a password" /><button type="button" className="auth-eye" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} onClick={() => setVisible((current) => !current)}><svg viewBox="0 0 24 24" aria-hidden="true">{visible ? <><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 5.2A11 11 0 0 1 12 5c5 0 8.5 4.5 9.5 7a11.7 11.7 0 0 1-3.1 4.3M6.2 6.2A13 13 0 0 0 2.5 12c1 2.5 4.5 7 9.5 7a10 10 0 0 0 3.2-.5" /></> : <><path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" /><circle cx="12" cy="12" r="2.6" /></>}</svg></button></span>
          <div className="auth-password-tools"><button type="button" className="auth-text-button" onClick={handleSuggestPassword}>Suggest a strong password</button>{passwordNotice && <span role="status">{passwordNotice}</span>}</div>
        </div>
        {error && <p role="alert" className="auth-error">{error}</p>}
        <button type="submit" disabled={isSubmitting} className="auth-submit">{isSubmitting ? "Creating account…" : "Create account"}<span aria-hidden="true">→</span></button>
      </form>
      <div className="auth-divider"><span>or sign up with</span></div>
      <GoogleAuthButton onError={setError} onBusyChange={setIsSubmitting} />
      <p className="auth-switch">Already have an account? <Link to="/">Sign in</Link></p></> : <>
        <p className="auth-form-kicker">VERIFY YOUR ACCOUNT</p><h1>Check your messages.</h1>
        <p className="auth-form-intro">Enter the six-digit codes sent to your email{phoneNumber ? " and mobile number" : ""}.</p>
        {verificationMessage && <p className="auth-inline-success" role="status">{verificationMessage}</p>}
        <div className="auth-verification-list">
          <form className="auth-form auth-verification-card" onSubmit={(event) => { event.preventDefault(); confirmVerification(email, emailCode, "email"); }}>
            <div className="auth-verification-title"><AuthFieldIcon name="email" /><span>Email address</span><strong className={emailVerified ? "is-verified" : ""}>{emailVerified ? "Verified" : "Required"}</strong></div>
            <p>{email}</p>
            {!emailVerified && <><div className="auth-input-wrap"><input aria-label="Email verification code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={emailCode} onChange={(event) => setEmailCode(event.target.value.replace(/\D/g, ""))} className="auth-input" placeholder="6-digit email code" /></div><div className="auth-verify-actions"><button type="submit" className="auth-submit" disabled={isSubmitting}>{isSubmitting ? "Verifying…" : "Verify email"}</button><button type="button" className="auth-text-button" onClick={() => requestVerification(email).catch((err) => setError(err.response?.data?.detail || "Could not resend the email code."))}>Resend</button></div></>}
          </form>
          {phoneNumber && <form className="auth-form auth-verification-card" onSubmit={(event) => { event.preventDefault(); confirmVerification(phoneNumber, phoneCode, "phone"); }}>
            <div className="auth-verification-title"><AuthFieldIcon name="phone" /><span>Mobile number</span><strong className={phoneVerified ? "is-verified" : ""}>{phoneVerified ? "Verified" : "Required"}</strong></div>
            <p>{phoneNumber}</p>
            {!phoneVerified && <><div className="auth-input-wrap"><input aria-label="Mobile verification code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={phoneCode} onChange={(event) => setPhoneCode(event.target.value.replace(/\D/g, ""))} className="auth-input" placeholder="6-digit SMS code" /></div><div className="auth-verify-actions"><button type="submit" className="auth-submit" disabled={isSubmitting}>{isSubmitting ? "Verifying…" : "Verify mobile"}</button><button type="button" className="auth-text-button" onClick={() => requestVerification(phoneNumber).catch((err) => setError(err.response?.data?.detail || "Could not resend the SMS code."))}>Resend</button></div></>}
          </form>}
        </div>
        {error && <p role="alert" className="auth-error">{error}</p>}
        <p className="auth-switch">Already verified? <Link to="/">Sign in</Link></p>
      </>}
    </AuthLayout>
  );
}

export default Signup;
