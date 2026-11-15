import { Navigate, Link } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { Icon } from "../components/AppShell";
import { getCandidateId } from "../api/session";

export default function Welcome() {
  if (!getCandidateId()) return <Navigate to="/" replace />;
  let name = "";
  try { name = localStorage.getItem("candidateName") || ""; } catch { /* Use the concise fallback when storage is unavailable. */ }
  const firstName = name.trim().split(/\s+/)[0];
  return (
    <main className="welcome-page" onPointerMove={(event) => {
      if (event.pointerType !== "mouse") return;
      const bounds = event.currentTarget.getBoundingClientRect();
      event.currentTarget.style.setProperty("--pointer-x", `${((event.clientX - bounds.left) / bounds.width - 0.5) * 15}px`);
      event.currentTarget.style.setProperty("--pointer-y", `${((event.clientY - bounds.top) / bounds.height - 0.5) * 12}px`);
    }}>
      <div className="page-atmosphere" aria-hidden="true"><i className="atmosphere-glow" /><i className="atmosphere-orbit" /><i className="atmosphere-spark spark-a" /><i className="atmosphere-spark spark-b" /></div>
      <section className="welcome-stage">
        <Link to="/home" className="welcome-brand"><span><BrandLogo /></span><strong>Interview<span>AI</span></strong></Link>
        <div className="welcome-stage-art" aria-hidden="true"><span className="welcome-stage-orbit orbit-a" /><span className="welcome-stage-orbit orbit-b" /><span className="welcome-stage-orb"><Icon name="play" size={38} /></span><i className="welcome-stage-chip chip-a"><Icon name="file" size={17} /></i><i className="welcome-stage-chip chip-b"><Icon name="chart" size={17} /></i></div>
        <div className="welcome-stage-copy"><span className="welcome-kicker"><span className="welcome-dot" /> SESSION READY</span><h1>{firstName ? `You’re in, ${firstName}.` : "You’re in."}</h1><p>Choose where to begin.</p><div className="welcome-stage-actions"><Link to="/home" className="button-primary">Open dashboard <Icon name="arrow" size={17} /></Link><Link to="/create" className="button-secondary">Start an interview <Icon name="plus" size={17} /></Link></div></div>
      </section>
    </main>
  );
}
