import { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import { getCandidateId } from "../api/session";
import { Icon } from "../components/AppShell";

function CreateInterview() {
  const navigate = useNavigate();
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [step, setStep] = useState(1);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState(null);

  async function handleStart() {
    setError(null);
    const candidateId = getCandidateId();
    if (!candidateId) {
      navigate("/");
      return;
    }
    setIsStarting(true);
    try {
      const { data: interview } = await apiClient.post("/interviews", {
        candidate_id: Number(candidateId),
        company: company.trim(),
        role: role.trim(),
      });
      const { data: questions } = await apiClient.post(
        "/interviews/" + interview.id + "/generate-questions"
      );
      navigate("/interview", { state: { interviewId: interview.id, questions } });
    } catch (err) {
      setError(err.response?.status === 404
        ? "Your account couldn't be found. Please log in again."
        : "We couldn't prepare your interview just now. Please try again.");
      console.error(err);
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <div className="create-layout">
      <section className="panel create-card">
        <div className="stepper" aria-label={"Step " + step + " of 2"}>
          <div className={"step-item " + (step >= 1 ? "current " : "") + (step > 1 ? "done" : "")}><span>{step > 1 ? "✓" : "01"}</span><div><strong>Role details</strong><small>Set your target</small></div></div>
          <span className={"step-connector " + (step > 1 ? "filled" : "")} />
          <div className={"step-item " + (step === 2 ? "current" : "")}><span>02</span><div><strong>Review &amp; begin</strong><small>Meet your questions</small></div></div>
        </div>
        {step === 1 ? (
          <>
            <div className="form-intro"><span className="eyebrow blue-eyebrow">A LITTLE CONTEXT GOES A LONG WAY</span><h2>What role are you<br />getting ready for?</h2><p>We’ll shape your questions around the position and team you have in mind.</p></div>
            <form className="create-form" onSubmit={(event) => { event.preventDefault(); setStep(2); }}>
              <label htmlFor="target-role">Target role<span className="required-dot">*</span><input id="target-role" autoComplete="organization-title" required value={role} onChange={(event) => setRole(event.target.value)} placeholder="e.g. Product Designer" /></label>
              <label htmlFor="target-company">Company<span className="required-dot">*</span><input id="target-company" autoComplete="organization" required value={company} onChange={(event) => setCompany(event.target.value)} placeholder="e.g. Acme, Inc." /></label>
              {error && <p role="alert" className="form-error">{error}</p>}
              <button className="button-primary wide-button" type="submit">Review your interview <Icon name="arrow" size={18} /></button>
            </form>
            <div className="privacy-note"><Icon name="sparkle" size={16} /> Your practice details stay connected to your account.</div>
          </>
        ) : (
          <>
            <div className="form-intro"><span className="eyebrow blue-eyebrow">READY WHEN YOU ARE</span><h2>Your next practice<br />session is set.</h2><p>Take a breath. We’ll prepare a focused set of questions for this opportunity.</p></div>
            <div className="review-summary"><div><span>ROLE</span><strong>{role}</strong></div><div><span>COMPANY</span><strong>{company}</strong></div><span className="review-mark"><Icon name="sparkle" size={20} /></span></div>
            {error && <p role="alert" className="form-error">{error}</p>}
            <div className="review-actions"><button className="button-secondary" type="button" disabled={isStarting} onClick={() => setStep(1)}>Edit details</button><button className="button-primary" type="button" disabled={isStarting} onClick={handleStart}>{isStarting ? <><span className="button-spinner" /> Preparing…</> : <>Generate my questions <Icon name="arrow" size={18} /></>}</button></div>
            <div className="privacy-note"><Icon name="clock" size={16} /> Most practice sessions take about 10–15 minutes.</div>
          </>
        )}
      </section>
      <aside className="create-aside">
        <div className="aside-illustration"><div className="paper-stack"><span /><span /><span /><span /></div><span className="illustration-badge"><Icon name="sparkle" size={19} /></span></div>
        <span className="eyebrow blue-eyebrow">MADE FOR REAL INTERVIEWS</span>
        <h3>Practice with purpose.</h3>
        <p>Get role-specific questions, answer in your own way, and leave with feedback you can use.</p>
        <div className="benefit-list"><span><i>✓</i> Questions tailored to your target role</span><span><i>✓</i> Type or record your answers</span><span><i>✓</i> Actionable feedback after every session</span></div>
      </aside>
    </div>
  );
}

export default CreateInterview;
