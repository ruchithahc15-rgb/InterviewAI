import { useState } from "react";
import { Link, NavLink, Navigate, useLocation, useNavigate } from "react-router-dom";
import { clearCandidateSession, getCandidateId } from "../api/session";
import BrandLogo from "./BrandLogo";

const navigation = [
  { to: "/home", label: "Dashboard", icon: "home", end: true },
  { to: "/create", label: "Create interview", icon: "plus" },
  { to: "/interviews", label: "My interviews", icon: "file" },
  { to: "/questions", label: "Question bank", icon: "stack" },
  { to: "/analytics", label: "Analytics", icon: "chart" },
  { to: "/profile", label: "Profile", icon: "user" },
];

const titles = {
  "/home": ["Dashboard", "Your preparation, at a glance"],
  "/create": ["Create interview", "Build a focused practice session"],
  "/interviews": ["My interviews", "Review your practice history"],
  "/questions": ["Question bank", "Revisit questions from your sessions"],
  "/analytics": ["Analytics", "See the progress behind your practice"],
  "/profile": ["Profile", "Manage your account details"],
  "/interview": ["Practice session", "Take your time. Think out loud."],
  "/results": ["Your feedback", "A clear view of what to work on next"],
};

export function Icon({ name, size = 20 }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
    stack: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M5 21v-1a7 7 0 0 1 14 0v1" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
    sparkle: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2L12 3z" /><path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14z" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    chart: <><path d="M4 19V5M4 19h17M8 15v-4h3v4M14 15V7h3v8" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name] || paths.sparkle}</svg>;
}

export default function AppShell({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const search = new URLSearchParams(location.search).get("q") || "";
  const candidateId = getCandidateId();
  if (!candidateId) return <Navigate to="/" replace state={{ from: location.pathname }} />;
  const title = titles[location.pathname] || ["InterviewAI", "Make every practice session count"];
  function submitSearch(event) {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get("q")?.toString().trim() || "";
    if (!query) return;
    navigate(`/interviews?q=${encodeURIComponent(query)}`);
    setMenuOpen(false);
  }

  function confirmLogout() {
    clearCandidateSession();
    setShowLogoutConfirm(false);
    navigate("/", { replace: true });
  }

  return (
    <div className="app-shell">
      <aside className={`app-sidebar ${menuOpen ? "is-open" : ""}`}>
        <Link to="/home" className="brand-lockup" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark"><BrandLogo /></span>
          <span>Interview<span className="brand-light">AI</span><small>PREP STUDIO</small></span>
        </Link>
        <p className="nav-caption">WORKSPACE</p>
        <nav className="primary-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setMenuOpen(false)} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <Icon name={item.icon} /><span>{item.label}</span>{item.to === "/create" && <span className="nav-plus">+</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip"><Icon name="sparkle" size={18} /><p><strong>Small steps add up.</strong><br />A little practice today builds confidence tomorrow.</p></div>
          <button className="logout-link" onClick={() => setShowLogoutConfirm(true)}><Icon name="logout" size={18} />Log out</button>
          <span className="sidebar-version">INTERVIEWAI · PREP STUDIO</span>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button className="menu-toggle" aria-label="Toggle navigation" onClick={() => setMenuOpen(!menuOpen)}><span /><span /><span /></button>
          <form className="global-search" onSubmit={submitSearch}>
            <Icon name="search" size={18} />
            <input name="q" aria-label="Search interviews and questions" placeholder="Search interviews, roles, companies, or questions" defaultValue={search} />
            <kbd>↵</kbd>
          </form>
          <div className="topbar-user"><span className="online-dot" /><span>YOUR WORKSPACE</span></div>
        </header>
        <main className="page-main">
          <div className="page-heading"><div><p className="eyebrow">{title[0]}</p><h1>{title[1]}</h1></div><span className="heading-date"><Icon name="sparkle" size={16} /> YOUR PERSONAL PRACTICE SPACE</span></div>
          <div key={location.pathname} className="route-transition">{children}</div>
          <footer className="app-footer"><span>© 2026 InterviewAI · Practice with purpose.</span><span>Built for your next opportunity</span></footer>
        </main>
      </div>
      {menuOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}

      {showLogoutConfirm && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="logout-dialog-title">
          <div className="modal-card">
            <div className="modal-icon warning">
              <Icon name="logout" size={24} />
            </div>
            <h3 id="logout-dialog-title">Sign out of InterviewAI?</h3>
            <p>You’ll need to sign back in with your credentials to access your saved interviews, evaluations, and progress.</p>
            <div className="modal-actions">
              <button type="button" className="button-secondary" onClick={() => setShowLogoutConfirm(false)}>
                Stay signed in
              </button>
              <button type="button" className="button-danger" onClick={confirmLogout}>
                Yes, sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
