import { Link } from "react-router-dom";
import BrandLogo from "./BrandLogo";

export function AuthFieldIcon({ name }) {
  const paths = {
    person: <><circle cx="12" cy="8" r="4" /><path d="M5 21v-1a7 7 0 0 1 14 0v1" /></>,
    email: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
    phone: <><path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M10 17h4" /></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
    code: <><path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14" /></>,
  };
  return <svg className="auth-input-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function BrandMark() {
  return <span className="auth-brand-icon"><BrandLogo /></span>;
}

export default function AuthLayout({ children, isSignup = false, intro = null }) {
  return (
    <main className="auth-page" onPointerMove={(event) => {
      if (event.pointerType !== "mouse") return;
      const bounds = event.currentTarget.getBoundingClientRect();
      event.currentTarget.style.setProperty("--pointer-x", `${((event.clientX - bounds.left) / bounds.width - 0.5) * 15}px`);
      event.currentTarget.style.setProperty("--pointer-y", `${((event.clientY - bounds.top) / bounds.height - 0.5) * 12}px`);
    }}>
      <div className="page-atmosphere" aria-hidden="true"><i className="atmosphere-glow" /><i className="atmosphere-orbit" /><i className="atmosphere-spark spark-a" /><i className="atmosphere-spark spark-b" /></div>
      {intro}
      <div className={`auth-layout ${isSignup ? "is-signup" : "is-login"}`}>
        <aside className="auth-editorial">
          <div className="auth-ambient" aria-hidden="true"><i className="ambient-ring" /><i className="ambient-orb orb-one" /><i className="ambient-orb orb-two" /><i className="ambient-slab" /></div>
          <div className="auth-play-orb" aria-hidden="true"><span className="play-orb-halo" /><span className="play-orb-glass"><i /></span><span className="play-orb-node node-one" /><span className="play-orb-node node-two" /></div>
          <Link className="auth-brand" to="/"><BrandMark /><span>Interview<span>AI</span></span></Link>
          <div className="auth-editorial-copy">
            <h2>{isSignup ? <>Prepare with<br /><em>confidence.</em></> : <>Show them<br />what you <em>know.</em></>}</h2>
          </div>
        </aside>
        <section className="auth-form-side">
          <div className="auth-mobile-brand"><BrandMark /><span>Interview<span>AI</span></span></div>
          <div className={`auth-card ${isSignup ? "signup-card" : ""}`}>{children}</div>
        </section>
      </div>
    </main>
  );
}
