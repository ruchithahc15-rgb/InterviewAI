import { useEffect, useMemo, useState } from "react";
import apiClient from "../api/client";
import { Icon } from "../components/AppShell";
import { getCandidateId } from "../api/session";

const dimensions = [
  ["Accuracy", "accuracy_score"],
  ["Relevance", "relevance_score"],
  ["Technical depth", "technical_score"],
  ["Communication", "grammar_score"],
  ["Confidence", "confidence_score"],
];

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length : 0;
}

function TrendChart({ sessions }) {
  const points = sessions.filter((session) => session.score !== null);
  if (points.length === 0) {
    return (
      <div className="chart-empty">
        <span className="chart-empty-mark"><Icon name="chart" size={24} /></span>
        <strong>No evaluated sessions yet</strong>
        <p>Complete a practice session to see your score plotted here.</p>
      </div>
    );
  }
  const width = 680, height = 210, left = 48, right = 24, top = 20, bottom = 36;
  const x = (index) => left + (points.length === 1 ? (width - left - right) / 2 : index * (width - left - right) / (points.length - 1));
  const y = (score) => top + (100 - score) * (height - top - bottom) / 100;
  const line = points.map((point, index) => (index ? "L" : "M") + x(index) + " " + y(point.score)).join(" ");
  const area = points.length > 1 ? line + " L " + x(points.length - 1) + " " + (height - bottom) + " L " + x(0) + " " + (height - bottom) + " Z" : null;
  return (
    <svg className="trend-svg" viewBox={"0 0 " + width + " " + height} role="img" aria-label="Interview scores across evaluated sessions">
      <defs>
        <linearGradient id="analyticsTrendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#25c6b0" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#25c6b0" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0, 25, 50, 75, 100].map((tick) => (
        <g key={tick}>
          <line x1={left} y1={y(tick)} x2={width - right} y2={y(tick)} className="chart-gridline" />
          <text x={left - 10} y={y(tick) + 4} textAnchor="end" className="chart-label">{tick}</text>
        </g>
      ))}
      {area && <path d={area} fill="url(#analyticsTrendFill)" />}
      {points.length > 1 && <path d={line} className="trend-line" />}
      {points.map((point, index) => (
        <g key={point.id} className="cursor-pointer">
          <circle cx={x(index)} cy={y(point.score)} r="12" fill="transparent" />
          <circle cx={x(index)} cy={y(point.score)} r="5.5" className="trend-point" />
          <text x={x(index)} y={y(point.score) - 10} textAnchor="middle" className="chart-label font-bold" fill="#142238">
            {Math.round(point.score)}
          </text>
          <text x={x(index)} y={height - 10} textAnchor="middle" className="chart-label">
            Session {point.id}
          </text>
        </g>
      ))}
    </svg>
  );
}

function Analytics() {
  const candidateId = Number(getCandidateId());
  const [interviews, setInterviews] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [range, setRange] = useState("10");
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
        const mineQuestionIds = new Set(mineQuestions.map((item) => item.id));
        const mineResponses = responsesRes.data.filter((item) => mineQuestionIds.has(item.question_id));
        const mineResponseIds = new Set(mineResponses.map((item) => item.id));
        setInterviews(mine.sort((a, b) => a.id - b.id));
        setQuestions(mineQuestions);
        setResponses(mineResponses);
        setEvaluations(evaluationsRes.data.filter((item) => mineResponseIds.has(item.response_id)));
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, [candidateId]);

  const sessions = useMemo(() => {
    const questionById = new Map(questions.map((item) => [item.id, item]));
    const responseById = new Map(responses.map((item) => [item.id, item]));
    const evaluationsByQuestion = new Map();
    evaluations.forEach((evaluation) => {
      const response = responseById.get(evaluation.response_id);
      const question = response && questionById.get(response.question_id);
      if (!question) return;
      const list = evaluationsByQuestion.get(question.interview_id) || [];
      list.push(evaluation);
      evaluationsByQuestion.set(question.interview_id, list);
    });
    return interviews.map((interview) => {
      const scores = evaluationsByQuestion.get(interview.id) || [];
      const allScores = scores.flatMap((item) => dimensions.map(([, field]) => Number(item[field] || 0)));
      return { ...interview, score: allScores.length ? average(allScores) : null, evaluationCount: scores.length };
    });
  }, [interviews, questions, responses, evaluations]);

  const visibleSessions = range === "all" ? sessions : sessions.slice(-Number(range));
  const evaluated = evaluations;
  const skillScores = dimensions.map(([label, field]) => ({ label, score: Math.round(average(evaluated.map((item) => item[field]))) }));
  const overall = Math.round(average(evaluated.flatMap((item) => dimensions.map(([, field]) => Number(item[field] || 0)))));
  const strongest = skillScores.length ? [...skillScores].sort((a, b) => b.score - a.score)[0] : null;
  const completed = interviews.filter((item) => item.status === "completed").length;
  const progress = interviews.length - completed;
  const totalQuestions = questions.length;
  const answeredQuestions = new Set(responses.filter((item) => item.answer?.trim()).map((item) => item.question_id)).size;
  const answerRate = totalQuestions ? Math.round(answeredQuestions / totalQuestions * 100) : 0;
  const sessionRate = interviews.length ? Math.round(completed / interviews.length * 100) : 0;
  return (
    <div className="analytics-page">
      <div className="analytics-toolbar"><div><span className="eyebrow teal-eyebrow">YOUR PRACTICE, IN PERSPECTIVE</span><p>Patterns become progress when you can see them.</p></div><label className="range-select"><span>SESSIONS</span><select value={range} onChange={(event) => setRange(event.target.value)}><option value="5">Last 5</option><option value="10">Last 10</option><option value="all">All time</option></select></label></div>
      {error ? <section className="panel analytics-error"><h2>Analytics are unavailable</h2><p>We couldn’t load your saved interview data. Check your connection and try again.</p></section> : <>
        <section className="analytics-kpis">
          <article className="analytics-kpi"><span>AVERAGE SCORE</span><strong>{loading ? "—" : evaluated.length ? overall : "—"}</strong><small>{evaluated.length ? "Across " + evaluated.length + " evaluated answers" : "Scores appear after feedback is generated"}</small><i className="kpi-glyph"><Icon name="chart" size={19} /></i></article>
          <article className="analytics-kpi"><span>SESSIONS COMPLETED</span><strong>{loading ? "—" : completed}</strong><small>{progress ? progress + " session" + (progress === 1 ? "" : "s") + " in progress" : "Your practice history"}</small><i className="kpi-glyph"><Icon name="file" size={19} /></i></article>
          <article className="analytics-kpi"><span>ANSWERS PRACTICED</span><strong>{loading ? "—" : answeredQuestions}</strong><small>Of {totalQuestions} questions generated</small><i className="kpi-glyph"><Icon name="stack" size={19} /></i></article>
          <article className="analytics-kpi"><span>STRONGEST AREA</span><strong className="kpi-strongest">{loading ? "—" : evaluated.length ? strongest.label : "—"}</strong><small>{evaluated.length ? strongest.score + " / 100 average" : "Your strengths will emerge"}</small><i className="kpi-glyph"><Icon name="sparkle" size={19} /></i></article>
        </section>
        <section className="analytics-grid">
          <article className="panel chart-panel trend-panel"><div className="chart-heading"><div><span className="chart-overline">PERFORMANCE</span><h2>Score over time</h2><p>Average evaluation scores by interview session</p></div><span className="chart-unit">0–100</span></div>{loading ? <div className="chart-empty">Loading score history…</div> : <TrendChart sessions={visibleSessions} />}</article>
          <article className="panel chart-panel skills-panel"><div className="chart-heading"><div><span className="chart-overline">FIVE DIMENSIONS</span><h2>Where you’re growing</h2><p>Average scores across your evaluated answers</p></div></div>{loading ? <div className="chart-empty">Loading skill scores…</div> : evaluated.length ? <div className="skill-chart">{skillScores.map((skill) => <div className="skill-row" key={skill.label}><div><span>{skill.label}</span><strong>{skill.score}</strong></div><div className="skill-track"><span style={{ width: skill.score + "%" }} /></div></div>)}</div> : <div className="chart-empty"><span className="chart-empty-mark"><Icon name="sparkle" size={22} /></span><strong>Feedback makes this chart useful</strong><p>Finish an interview to see a detailed view across your answer skills.</p></div>}</article>
          <article className="panel chart-panel completion-panel"><div className="chart-heading"><div><span className="chart-overline">PRACTICE RHYTHM</span><h2>Session mix</h2><p>Completed and in-progress interviews</p></div></div><div className="mix-chart-wrap"><div className="mix-chart" style={{ "--completed": sessionRate + "%", "--mix-color": "var(--teal)" }}><div><strong>{interviews.length}</strong><small>SESSIONS</small></div></div><div className="mix-legend"><span><i className="legend-complete" />Completed <strong>{completed}</strong></span><span><i className="legend-progress" />In progress <strong>{progress}</strong></span><span><i className="legend-answers" />Questions answered <strong>{answerRate}%</strong></span></div></div></article>
          <article className="panel insight-panel"><span className="insight-icon"><Icon name="sparkle" size={19} /></span><span className="chart-overline">A NOTE ON YOUR DATA</span><h2>Progress is a practice.</h2><p>Scores reflect saved evaluations only. Keep practicing across different question types to build a fuller picture of your interview readiness.</p><span className="insight-foot">{evaluated.length} EVALUATED ANSWERS · {sessions.length} TOTAL SESSIONS</span></article>
        </section>
      </>}
    </div>
  );
}

export default Analytics;
