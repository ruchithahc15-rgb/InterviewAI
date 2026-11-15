import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import { getCandidateId } from "../api/session";
import { Icon } from "../components/AppShell";

function getRoleSkillProfile(role) {
  const value = role.toLowerCase();
  if (/design|ux|ui/.test(value)) return { languages: ["HTML & CSS", "JavaScript", "TypeScript"], fundamentals: ["User research", "Interaction design", "Prototyping", "Design systems", "Accessibility", "Product thinking"], technologies: ["Figma", "FigJam", "Adobe XD", "Framer", "Webflow", "Storybook", "WCAG", "Usability testing"], databases: false };
  if (/dev.?ops|platform|cloud|site reliability|sre/.test(value)) return { languages: ["Python", "Go", "JavaScript", "Java"], fundamentals: ["Linux", "CI/CD", "Observability"], technologies: ["AWS", "Azure", "Google Cloud", "Docker", "Kubernetes", "Terraform", "Ansible", "Prometheus"], databases: true };
  if (/qa|test|quality/.test(value)) return { languages: ["Java", "Python", "JavaScript", "TypeScript", "C#"], fundamentals: ["Test planning", "API testing", "Regression testing", "Bug analysis"], technologies: ["Playwright", "Cypress", "Selenium", "Postman", "Jest", "JMeter"], databases: true };
  if (/mobile|android|ios/.test(value)) return { languages: ["Kotlin", "Swift", "Java", "Dart"], fundamentals: ["Mobile architecture", "API integration", "App performance"], technologies: ["Android SDK", "Jetpack Compose", "SwiftUI", "Flutter", "React Native", "Firebase"], databases: true };
  if (/data|analyst|machine learning|ml engineer/.test(value)) return { languages: ["Python", "SQL", "R", "Scala"], fundamentals: ["Data modeling", "Statistics", "Data visualization", "Machine learning"], technologies: ["Pandas", "NumPy", "scikit-learn", "PyTorch", "TensorFlow", "Spark", "Power BI", "Tableau"], databases: true };
  if (/front.?end|web developer|react developer/.test(value)) return { languages: ["JavaScript", "TypeScript"], fundamentals: ["HTML & CSS", "Accessibility", "Web performance"], technologies: ["React", "Vue", "Angular", "Tailwind CSS", "Vite", "Storybook", "Playwright"], databases: false };
  if (/back.?end|api|server/.test(value)) return { languages: ["Java", "Python", "JavaScript", "TypeScript", "Go", "C#"], fundamentals: ["REST APIs", "System design", "Backend testing", "Security"], technologies: ["GraphQL", "gRPC", "Kafka", "Docker", "Redis", "Kubernetes"], databases: true };
  if (/full.?stack/.test(value)) return { languages: ["JavaScript", "TypeScript", "Java", "Python", "C#"], fundamentals: ["Frontend architecture", "REST APIs", "System design", "Testing", "Web security"], technologies: ["React", "Node.js", "Spring Boot", "Django", "Docker", "GraphQL"], databases: true };
  return { languages: ["JavaScript", "TypeScript", "Java", "Python", "C#", "Go"], fundamentals: ["Problem solving", "System design", "Communication", "Testing"], technologies: ["Git", "Docker", "REST APIs", "Cloud fundamentals", "CI/CD", "Security basics"], databases: true };
}

const frameworkOptions = {
  Java: ["Spring Boot", "Hibernate", "JPA", "Maven / Gradle"],
  "HTML & CSS": ["Responsive layouts", "Accessibility", "CSS architecture", "Web performance"],
  JavaScript: ["Node.js", "Express", "NestJS", "React"],
  TypeScript: ["Node.js", "NestJS", "React", "Angular"],
  Python: ["Django", "FastAPI", "Flask", "Pandas"],
  "C#": [".NET", "ASP.NET Core", "Entity Framework"],
  Go: ["Gin", "Echo", "gRPC"],
  Kotlin: ["Android SDK", "Jetpack Compose", "Ktor"],
  Swift: ["SwiftUI", "UIKit", "Core Data"],
  Dart: ["Flutter", "Riverpod", "Dart fundamentals"],
  Figma: ["Auto layout", "Components", "Variables", "Prototyping"],
  FigJam: ["Journey mapping", "Workshop facilitation", "Ideation"],
  "Adobe XD": ["Interactive prototypes", "Design specs"],
  Framer: ["Responsive prototyping", "Motion design"],
  Webflow: ["CMS", "Responsive design", "Interactions"],
  SQL: ["Query design", "Window functions", "Query optimization"],
  R: ["Tidyverse", "Shiny", "Statistical modeling"],
  Scala: ["Spark", "Akka", "Functional programming"],
};
const databaseOptions = {
  SQL: ["PostgreSQL", "MySQL", "Microsoft SQL Server", "SQLite"],
  NoSQL: ["MongoDB", "Redis", "DynamoDB", "Cassandra"],
};

function CreateInterview() {
  const navigate = useNavigate();
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [skills, setSkills] = useState([]);
  const [language, setLanguage] = useState("");
  const [databaseType, setDatabaseType] = useState("");
  const [customSkill, setCustomSkill] = useState("");
  const [skipCompany, setSkipCompany] = useState(false);
  const [step, setStep] = useState(1);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState(null);
  const skillProfile = useMemo(() => getRoleSkillProfile(role), [role]);

  function toggleSkill(skill) {
    setSkills((selected) => selected.includes(skill) ? selected.filter((item) => item !== skill) : [...selected, skill]);
  }

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
        candidate_id: Number(candidateId), company: company.trim(), role: role.trim(), skills,
      });
      const { data: questions } = await apiClient.post(`/interviews/${interview.id}/generate-questions`);
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
      <section className="panel create-card create-wizard">
        <div className="create-progress" aria-label={`Step ${step} of 4`}>
          {["Role", "Skills", "Company", "Review"].map((label, index) => <span className={step > index ? "is-complete" : ""} key={label}>{label}</span>)}
        </div>
        {step === 1 && <section className="create-step" key="role">
          <div className="form-intro"><span className="eyebrow blue-eyebrow">01 / ROLE</span><h2>What role are you preparing for?</h2></div>
          <form className="create-form" onSubmit={(event) => { event.preventDefault(); setSkills([]); setLanguage(""); setDatabaseType(""); setStep(2); }}>
            <label htmlFor="target-role">Target role<span className="required-dot">*</span><input id="target-role" autoComplete="organization-title" required value={role} onChange={(event) => setRole(event.target.value)} placeholder="e.g. Frontend Engineer" /></label>
            <button className="button-primary wide-button" type="submit">Choose skills <Icon name="arrow" size={18} /></button>
          </form>
        </section>}
        {step === 2 && <section className="create-step" key="skills">
          <div className="form-intro"><span className="eyebrow blue-eyebrow">02 / FOCUS</span><h2>Choose what to practice</h2><p>Suggestions for <strong>{role}</strong>. Select the areas your target company cares about.</p></div>
          <div className="skill-choice-grid" aria-label="Suggested interview skills">
            {skillProfile.languages.length > 0 && <div className="skill-group"><h3>Programming language</h3><div className="skill-option-row">{skillProfile.languages.map((option) => <button type="button" key={option} className={`skill-choice ${language === option ? "selected" : ""}`} aria-pressed={language === option} onClick={() => { setLanguage(option); setSkills((selected) => selected.filter((item) => !Object.values(frameworkOptions).flat().includes(item))); }}>{option}</button>)}</div></div>}
            {language && <div className="skill-group"><h3>{language} ecosystem</h3><div className="skill-option-row">{(frameworkOptions[language] || []).map((skill) => <button type="button" key={skill} className={`skill-choice ${skills.includes(skill) ? "selected" : ""}`} aria-pressed={skills.includes(skill)} onClick={() => toggleSkill(skill)}><span className="skill-check">{skills.includes(skill) ? "✓" : "+"}</span>{skill}</button>)}</div></div>}
            {skillProfile.databases && <div className="skill-group"><h3>Database type</h3><div className="skill-option-row">{["SQL", "NoSQL"].map((type) => <button type="button" key={type} className={`skill-choice ${databaseType === type ? "selected" : ""}`} aria-pressed={databaseType === type} onClick={() => { setDatabaseType(type); setSkills((selected) => selected.filter((item) => !Object.values(databaseOptions).flat().includes(item))); }}>{type}</button>)}</div></div>}
            {databaseType && <div className="skill-group"><h3>{databaseType} platforms</h3><div className="skill-option-row">{databaseOptions[databaseType].map((skill) => <button type="button" key={skill} className={`skill-choice ${skills.includes(skill) ? "selected" : ""}`} aria-pressed={skills.includes(skill)} onClick={() => toggleSkill(skill)}><span className="skill-check">{skills.includes(skill) ? "✓" : "+"}</span>{skill}</button>)}</div></div>}
            <div className="skill-group"><h3>Tools and technologies</h3><div className="skill-option-row">{skillProfile.technologies.map((skill) => <button type="button" key={skill} className={`skill-choice ${skills.includes(skill) ? "selected" : ""}`} aria-pressed={skills.includes(skill)} onClick={() => toggleSkill(skill)}><span className="skill-check">{skills.includes(skill) ? "✓" : "+"}</span>{skill}</button>)}</div></div>
            <div className="skill-group"><h3>Role skills</h3><div className="skill-option-row">{skillProfile.fundamentals.map((skill) => <button type="button" key={skill} className={`skill-choice ${skills.includes(skill) ? "selected" : ""}`} aria-pressed={skills.includes(skill)} onClick={() => toggleSkill(skill)}><span className="skill-check">{skills.includes(skill) ? "✓" : "+"}</span>{skill}</button>)}</div></div>
            <div className="skill-group"><h3>Add another skill</h3><div className="custom-skill-control"><input aria-label="Add a technology or skill" value={customSkill} onChange={(event) => setCustomSkill(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); const skill = customSkill.trim(); if (skill && !skills.includes(skill)) setSkills((selected) => [...selected, skill]); setCustomSkill(""); } }} placeholder="Technology, tool, or skill" /><button type="button" className="button-secondary" onClick={() => { const skill = customSkill.trim(); if (skill && !skills.includes(skill)) setSkills((selected) => [...selected, skill]); setCustomSkill(""); }}>Add skill</button></div></div>
          </div>
          <div className="create-step-actions"><button className="button-secondary" type="button" onClick={() => setStep(1)}>Back</button><button className="button-primary" type="button" onClick={() => setStep(3)}>Continue to company <Icon name="arrow" size={18} /></button></div>
        </section>}
        {step === 3 && <section className="create-step" key="company">
          <div className="form-intro"><span className="eyebrow blue-eyebrow">03 / COMPANY</span><h2>Where are you interviewing?</h2></div>
          <form className="create-form" onSubmit={(event) => { event.preventDefault(); setStep(4); }}>
            {!skipCompany && <label htmlFor="target-company">Company name<input id="target-company" autoComplete="organization" value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Enter company name" /></label>}
            <label className="skip-company-toggle"><input type="checkbox" checked={skipCompany} onChange={(event) => { setSkipCompany(event.target.checked); if (event.target.checked) setCompany(""); }} /><span>I don’t need company-specific questions</span></label>
            <div className="create-step-actions"><button className="button-secondary" type="button" onClick={() => setStep(2)}>Back to skills</button><button className="button-primary" type="submit">Review interview <Icon name="arrow" size={18} /></button></div>
          </form>
        </section>}
        {step === 4 && <section className="create-step" key="review">
          <div className="form-intro"><span className="eyebrow blue-eyebrow">04 / READY</span><h2>Your practice, tailored.</h2></div>
          <div className="review-summary"><div><span>ROLE</span><strong>{role}</strong></div><div><span>SKILLS</span><div className="review-skill-list">{skills.length ? skills.map((skill) => <span key={skill}>{skill}</span>) : <strong>Broad role coverage</strong>}</div></div><div><span>COMPANY</span><strong>{company || "Not specified"}</strong></div></div>
          {error && <p role="alert" className="form-error">{error}</p>}
          <div className="review-actions"><button className="button-secondary" type="button" disabled={isStarting} onClick={() => setStep(3)}>Edit details</button><button className="button-primary" type="button" disabled={isStarting} onClick={handleStart}>{isStarting ? <><span className="button-spinner" /> Preparing…</> : <>Generate my questions <Icon name="arrow" size={18} /></>}</button></div>
        </section>}
      </section>
    </div>
  );
}

export default CreateInterview;
