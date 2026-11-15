import { useEffect, useMemo, useRef, useState } from "react";
import apiClient from "../api/client";
import { Icon } from "../components/AppShell";
import { getCandidateId } from "../api/session";

const scoreDimensions = [
  ["Accuracy", "accuracy_score", "#25c6b0"],
  ["Relevance", "relevance_score", "#6686dc"],
  ["Technical depth", "technical_score", "#8973c8"],
  ["Communication", "grammar_score", "#e5a25e"],
  ["Confidence", "confidence_score", "#62a27d"],
];

function average(items, field) {
  if (!items.length) return null;
  return Math.round(items.reduce((total, item) => total + Number(item[field] || 0), 0) / items.length);
}

function displayDateTime(value, options) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString(undefined, options);
}

function Analytics() {
  const candidateId = Number(getCandidateId());
  const [interviews, setInterviews] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [selectedInterviewId, setSelectedInterviewId] = useState("");
  const [interviewMenuOpen, setInterviewMenuOpen] = useState(false);
  const [hoveredSkill, setHoveredSkill] = useState("");
  const interviewPickerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const [interviewsRes, questionsRes, responsesRes, evaluationsRes] = await Promise.all([
          apiClient.get("/interviews"), apiClient.get("/questions"), apiClient.get("/responses"), apiClient.get("/evaluations"),
        ]);
        const mine = interviewsRes.data.filter((item) => item.candidate_id === candidateId);
        const mineIds = new Set(mine.map((item) => item.id));
        const mineQuestions = questionsRes.data.filter((item) => mineIds.has(item.interview_id));
        const questionIds = new Set(mineQuestions.map((item) => item.id));
        const mineResponses = responsesRes.data.filter((item) => questionIds.has(item.question_id));
        const responseIds = new Set(mineResponses.map((item) => item.id));
        setInterviews(mine.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)));
        setQuestions(mineQuestions);
        setResponses(mineResponses);
        setEvaluations(evaluationsRes.data.filter((item) => responseIds.has(item.response_id)));
        setSelectedInterviewId("");
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, [candidateId]);

  useEffect(() => {
    if (!interviewMenuOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!interviewPickerRef.current?.contains(event.target)) setInterviewMenuOpen(false);
    };
    const closeOnEscape = (event) => { if (event.key === "Escape") setInterviewMenuOpen(false); };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [interviewMenuOpen]);

  const completed = interviews.filter((item) => item.status === "completed");
  const evaluationByResponse = useMemo(() => new Map(evaluations.map((item) => [item.response_id, item])), [evaluations]);
  const responseByQuestion = useMemo(() => new Map(responses.map((item) => [item.question_id, item])), [responses]);
  const answeredQuestions = questions.filter((question) => responseByQuestion.get(question.id)?.answer?.trim());
  const allAnsweredResponses = answeredQuestions.map((question) => responseByQuestion.get(question.id)).filter(Boolean);
  const allEvaluations = allAnsweredResponses.map((response) => evaluationByResponse.get(response.id)).filter(Boolean);
  const selectedInterview = interviews.find((item) => String(item.id) === selectedInterviewId);
  const selectedQuestions = questions.filter((question) => question.interview_id === selectedInterview?.id);
  const selectedAnswers = selectedQuestions.map((question) => ({ question, response: responseByQuestion.get(question.id) })).filter((item) => item.response?.answer?.trim());
  const selectedEvaluations = selectedAnswers.map((item) => evaluationByResponse.get(item.response.id)).filter(Boolean);
  const skillAverages = [...selectedQuestions.reduce((groups, question) => {
    const response = responseByQuestion.get(question.id);
    const evaluation = response && evaluationByResponse.get(response.id);
    if (!evaluation) return groups;
    const skill = question.skill || "General practice";
    const score = Math.round(scoreDimensions.reduce((sum, [, field]) => sum + Number(evaluation[field] || 0), 0) / scoreDimensions.length);
    groups.set(skill, [...(groups.get(skill) || []), score]);
    return groups;
  }, new Map()).entries()].map(([skill, values]) => ({ skill, score: average(values.map((value) => ({ score: value })), "score") }));
  const overallScore = allEvaluations.length
    ? Math.round(allEvaluations.reduce((sum, item) => sum + scoreDimensions.reduce((dimensionSum, [, field]) => dimensionSum + Number(item[field] || 0), 0), 0) / (allEvaluations.length * scoreDimensions.length))
    : null;
  const skillCounts = selectedQuestions.reduce((counts, question) => {
    const skill = question.skill || "General practice";
    counts.set(skill, (counts.get(skill) || 0) + 1);
    return counts;
  }, new Map());
  const donutColors = ["#25c6b0", "#6686dc", "#8973c8", "#e5a25e", "#62a27d", "#d47568", "#5d9baa"];
  let donutOffset = 0;
  const donutSegments = [...skillCounts.entries()].map(([skill, count], index) => {
    const start = donutOffset;
    const percent = selectedQuestions.length ? count / selectedQuestions.length * 100 : 0;
    donutOffset += percent;
    return { skill, count, color: donutColors[index % donutColors.length], start, percent };
  });
  const selectedInterviewLabel = selectedInterview ? `${selectedInterview.role} · ${selectedInterview.company} · ${displayDateTime(selectedInterview.created_at, { dateStyle: "medium" })}` : "Choose an interview";

  return (
    <div className="analytics-page">
      {error ? <section className="panel analytics-error"><h2>Analytics are unavailable</h2><p>We couldn’t load your saved interview data. Check your connection and try again.</p></section> : <>
        <section className="analytics-cards" aria-label="Interview analytics">
          <details className="analytics-metric-card">
            <summary><span className="metric-icon"><Icon name="file" size={21} /></span><span className="metric-copy"><small>INTERVIEWS ATTENDED</small><strong>{loading ? "—" : completed.length}</strong><span>Choose a session to review</span></span><span className="metric-chevron"><Icon name="arrow" size={18} /></span></summary>
            <div className="metric-details">
              <label className="analytics-select-label" htmlFor="analytics-interview">Select an interview</label>
              <div className="interview-picker" ref={interviewPickerRef}>
                <button id="analytics-interview" type="button" className="interview-picker-trigger" aria-haspopup="listbox" aria-expanded={interviewMenuOpen} aria-controls="analytics-interview-options" onClick={() => setInterviewMenuOpen((open) => !open)}><span>{selectedInterviewLabel}</span><Icon name="arrow" size={17} /></button>
                {interviewMenuOpen && <div className="interview-picker-menu" id="analytics-interview-options" role="listbox" aria-label="Completed interviews">
                  {completed.length ? completed.map((interview) => <button type="button" role="option" aria-selected={String(interview.id) === selectedInterviewId} key={interview.id} onClick={() => { setSelectedInterviewId(String(interview.id)); setInterviewMenuOpen(false); }}><span><strong>{interview.role}</strong><small>{interview.company} · {displayDateTime(interview.created_at)}</small></span><i>{String(interview.id) === selectedInterviewId ? "Selected" : "Open"}</i></button>) : <p>No completed interviews yet.</p>}
                </div>}
              </div>
              {selectedInterview ? <div className="analytics-question-review"><div className="analytics-selected-heading"><div><h3>{selectedInterview.role}</h3><p>{selectedInterview.company} · {displayDateTime(selectedInterview.created_at)}</p></div><span>{selectedQuestions.length} questions</span></div>
                {selectedQuestions.length ? selectedQuestions.map((question, index) => {
                  const response = responseByQuestion.get(question.id);
                  return <details className="analytics-answer-item" key={question.id}><summary><span>{String(index + 1).padStart(2, "0")}</span><span>{question.question}</span><Icon name="arrow" size={16} /></summary><div><small>{question.skill || "GENERAL PRACTICE"}</small><p>{response?.answer?.trim() || "No answer was recorded for this question."}</p></div></details>;
                }) : <p className="analytics-empty-note">No questions are attached to this session.</p>}
              </div> : <p className="analytics-empty-note">Select an interview to open its questions and saved answers.</p>}
            </div>
          </details>

          <details className="analytics-metric-card">
            <summary><span className="metric-icon"><Icon name="chart" size={21} /></span><span className="metric-copy"><small>AVERAGE SCORE</small><strong>{loading ? "—" : overallScore === null ? "—" : `${overallScore}%`}</strong><span>{allEvaluations.length} evaluated answers</span></span><span className="metric-chevron"><Icon name="arrow" size={18} /></span></summary>
            <div className="metric-details"><div className="analytics-detail-heading"><h3>{selectedInterview ? `${selectedInterview.role} score breakdown` : "Score breakdown"}</h3><p>{selectedInterview ? "How the saved score was evaluated" : "Choose an interview above to see its breakdown."}</p></div>
              {selectedInterview && skillAverages.length > 0 && <div className="analytics-skill-chart" aria-label="Average score by skill"><h4>Average score by skill</h4>{skillAverages.map(({ skill, score }, index) => <div className="analytics-skill-bar" key={skill}><span>{skill}</span><div><i style={{ width: `${score}%`, animationDelay: `${index * 70}ms` }} /></div><strong>{score}</strong></div>)}</div>}
              {selectedInterview && (selectedEvaluations.length ? scoreDimensions.map(([label, field, color]) => {
                const score = average(selectedEvaluations, field);
                return <div className="analytics-score-row" key={field}><span>{label}</span><div><i style={{ width: `${score}%`, background: color }} /></div><strong>{score}</strong></div>;
              }) : <p className="analytics-empty-note">This interview does not have evaluated answers yet.</p>)}
            </div>
          </details>

          <details className="analytics-metric-card">
            <summary><span className="metric-icon"><Icon name="stack" size={21} /></span><span className="metric-copy"><small>QUESTIONS ANSWERED</small><strong>{loading ? "—" : answeredQuestions.length}</strong><span>Saved answers across interviews</span></span><span className="metric-chevron"><Icon name="arrow" size={18} /></span></summary>
            <div className="metric-details"><div className="analytics-detail-heading"><p>{selectedInterview ? `${selectedInterview.role} · ${selectedInterview.company}` : "Choose an interview above to see its skill mix."}</p></div>
              {selectedInterview && selectedQuestions.length ? <div className="skill-donut-layout"><div className="skill-donut" aria-label={`${selectedQuestions.length} questions across ${skillCounts.size} skills`}>
                <svg className="skill-donut-svg" viewBox="0 0 100 100" role="img" aria-label="Question count by skill">
                  {donutSegments.map((segment) => { const circumference = 2 * Math.PI * 39; const length = circumference * segment.percent / 100; return <circle key={segment.skill} cx="50" cy="50" r="39" fill="none" stroke={segment.color} strokeWidth="13" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-circumference * segment.start / 100} onMouseEnter={() => setHoveredSkill(segment.skill)} onMouseLeave={() => setHoveredSkill("")} onFocus={() => setHoveredSkill(segment.skill)} onBlur={() => setHoveredSkill("")} tabIndex="0" aria-label={`${segment.skill}: ${segment.count} ${segment.count === 1 ? "question" : "questions"}`}><title>{segment.skill}: {segment.count} {segment.count === 1 ? "question" : "questions"}</title></circle>; })}
                </svg><div><strong>{selectedQuestions.length}</strong><span>QUESTIONS</span></div>{hoveredSkill && <span className="donut-tooltip" role="status">{hoveredSkill}: {skillCounts.get(hoveredSkill)} {skillCounts.get(hoveredSkill) === 1 ? "question" : "questions"}</span>}
              </div><div className="skill-donut-legend">{[...skillCounts.entries()].map(([skill, count], index) => <div key={skill} onMouseEnter={() => setHoveredSkill(skill)} onMouseLeave={() => setHoveredSkill("")}><i style={{ background: donutColors[index % donutColors.length] }} /><span>{skill}</span><strong>{count}</strong></div>)}</div></div> : selectedInterview ? <p className="analytics-empty-note">No questions are attached to this session.</p> : null}
            </div>
          </details>
        </section>
      </>}
    </div>
  );
}

export default Analytics;
