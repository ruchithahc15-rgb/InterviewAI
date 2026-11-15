import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Navigate, useLocation, useNavigate } from "react-router-dom";
import { clearCandidateSession, getCandidateId } from "../api/session";
import BrandLogo from "./BrandLogo";

const navigation = [
  { to: "/home", label: "Dashboard", icon: "home", end: true },
  { to: "/create", label: "Create interview", icon: "edit" },
  { to: "/interviews", label: "My interviews", icon: "file" },
  { to: "/questions", label: "Question bank", icon: "stack" },
  { to: "/analytics", label: "Analytics", icon: "chart" },
  { to: "/profile", label: "Profile", icon: "user" },
];

const scrollJourney = ["/home", "/create", "/interviews", "/questions", "/analytics", "/profile"];
let lastJourneyAdvanceAt = 0;

const titles = {
  "/home": ["Dashboard", "Your preparation, at a glance"],
  "/create": ["Create interview", ""],
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
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /><path d="m14 6 4 4" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
    stack: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M5 21v-1a7 7 0 0 1 14 0v1" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5M12 15V3" /></>,
    trash: <><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    microphone: <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
    sparkle: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2L12 3z" /><path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14z" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    chart: <><path d="M4 19V5M4 19h17M8 15v-4h3v4M14 15V7h3v8" /></>,
    play: <path d="m8 5 12 7-12 7z" />,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name] || paths.sparkle}</svg>;
}

export default function AppShell({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const search = new URLSearchParams(location.search).get("q") || "";
  const [searchDraft, setSearchDraft] = useState({ locationSearch: search, value: search });
  const searchValue = searchDraft.locationSearch === search ? searchDraft.value : search;
  const [isListening, setIsListening] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");
  const [profileName, setProfileName] = useState(() => {
    try { return localStorage.getItem("candidateName") || "Profile"; } catch { return "Profile"; }
  });
  const [profileAvatar, setProfileAvatar] = useState(() => {
    try { return localStorage.getItem(`interviewai:avatar:${getCandidateId()}`) || ""; } catch { return ""; }
  });
  const recognitionRef = useRef(null);
  const activeNavigationIndex = Math.max(0, navigation.findIndex((item) => location.pathname === item.to || (item.to === "/interviews" && ["/interview", "/results"].includes(location.pathname))));
  const candidateId = getCandidateId();
  const title = titles[location.pathname] || ["InterviewAI", "Make every practice session count"];

  useEffect(() => {
    const syncProfile = () => {
      try {
        setProfileName(localStorage.getItem("candidateName") || "Profile");
        setProfileAvatar(localStorage.getItem(`interviewai:avatar:${getCandidateId()}`) || "");
      } catch { /* Keep the currently displayed profile state. */ }
    };
    window.addEventListener("storage", syncProfile);
    window.addEventListener("interviewai:profile-change", syncProfile);
    return () => {
      window.removeEventListener("storage", syncProfile);
      window.removeEventListener("interviewai:profile-change", syncProfile);
    };
  }, [candidateId]);

  useEffect(() => {
    if (!candidateId) return;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  }, [candidateId, location.pathname]);

  useEffect(() => {
    if (!candidateId || showLogoutConfirm) return undefined;
    const step = scrollJourney.indexOf(location.pathname);
    if (step < 0) return undefined;
    let advanced = false;
    let edgeTravel = 0;
    let edgeDirection = 0;
    const edgeThreshold = 230;
    const advanceAtEdge = (deltaY) => {
      if (advanced || deltaY === 0) return;
      // Keep one inertial wheel gesture from crossing multiple route boundaries.
      if (Date.now() - lastJourneyAdvanceAt < 1800) return;
      if (location.pathname === "/profile" && deltaY < 0) return;
      const page = document.documentElement;
      const atBottom = window.scrollY + window.innerHeight >= page.scrollHeight - 28;
      const atTop = window.scrollY <= 12;
      const nextStep = deltaY > 0 && atBottom ? step + 1 : deltaY < 0 && atTop ? step - 1 : -1;
      if (nextStep < 0 || nextStep >= scrollJourney.length) return;
      advanced = true;
      lastJourneyAdvanceAt = Date.now();
      navigate(scrollJourney[nextStep]);
    };
    const onWheel = (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (document.activeElement?.matches("select,input,textarea,[contenteditable='true']") || document.querySelector("[aria-haspopup='listbox'][aria-expanded='true']")) return;
      if (target?.closest("select,[role='listbox'],[role='menu'],input,textarea,[contenteditable='true']")) return;
      const direction = Math.sign(event.deltaY);
      const nestedScroller = target?.closest("[data-scrollable],.analytics-question-review,.question-list,.profile-history-list");
      if (nestedScroller && direction) {
        const hasOverflow = nestedScroller.scrollHeight > nestedScroller.clientHeight + 2;
        const canScroll = hasOverflow && (direction > 0
          ? nestedScroller.scrollTop + nestedScroller.clientHeight < nestedScroller.scrollHeight - 2
          : nestedScroller.scrollTop > 2);
        if (canScroll) return;
      }
      const page = document.documentElement;
      const atBottom = window.scrollY + window.innerHeight >= page.scrollHeight - 28;
      const atTop = window.scrollY <= 12;
      if ((direction > 0 && !atBottom) || (direction < 0 && !atTop) || direction !== edgeDirection) {
        edgeTravel = 0;
        edgeDirection = direction;
      }
      edgeTravel += Math.abs(event.deltaY);
      if (edgeTravel < edgeThreshold) return;
      edgeTravel = 0;
      advanceAtEdge(event.deltaY);
    };
    let touchStart = 0;
    let touchIsInteractive = false;
    const onTouchStart = (event) => {
      touchStart = event.touches[0]?.clientY || 0;
      const target = event.target instanceof Element ? event.target : null;
      touchIsInteractive = Boolean(document.activeElement?.matches("select,input,textarea,[contenteditable='true']") || document.querySelector("[aria-haspopup='listbox'][aria-expanded='true']") || target?.closest("select,[role='listbox'],[role='menu'],input,textarea,[contenteditable='true']"));
    };
    const onTouchEnd = (event) => {
      if (touchIsInteractive) { touchIsInteractive = false; return; }
      const touchEnd = event.changedTouches[0]?.clientY || touchStart;
      const delta = touchStart - touchEnd;
      if (Math.abs(delta) > 86) advanceAtEdge(delta > 0 ? 1 : -1);
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [candidateId, location.pathname, navigate, showLogoutConfirm]);

  useEffect(() => {
    const root = document.querySelector(".route-transition");
    if (!root) return undefined;
    const selector = ".panel,.stat-card,.dashboard-hero-card,.analytics-metric-card";
    let observer;
    const reveal = () => {
      root.querySelectorAll(selector).forEach((element) => {
        if (element.classList.contains("reveal-on-scroll")) return;
        element.classList.add("reveal-on-scroll");
        if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
          element.classList.add("is-visible");
        } else {
          observer?.observe(element);
        }
      });
    };
    if ("IntersectionObserver" in window) observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }), { threshold: 0.12, rootMargin: "0px 0px -36px 0px" });
    const mutations = new MutationObserver(reveal);
    reveal();
    mutations.observe(root, { childList: true, subtree: true });
    return () => { observer?.disconnect(); mutations.disconnect(); };
  }, [location.pathname]);

  if (!candidateId) return <Navigate to="/" replace state={{ from: location.pathname }} />;
  function submitSearch(event) {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get("q")?.toString().trim() || "";
    performSearch(query);
  }

  function performSearch(query) {
    const destination = location.pathname === "/questions" ? "/questions" : "/interviews";
    navigate(query ? `${destination}?q=${encodeURIComponent(query)}` : destination);
  }

  function toggleVoiceSearch() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setSearchMessage("Voice search isn’t available in this browser.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = navigator.language || "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim() || "";
      setSearchDraft({ locationSearch: search, value: transcript });
      setSearchMessage("");
      if (transcript) performSearch(transcript);
    };
    recognition.onerror = () => setSearchMessage("Voice search couldn’t hear that. Try again.");
    recognition.onend = () => { recognitionRef.current = null; setIsListening(false); };
    recognitionRef.current = recognition;
    setSearchMessage("");
    setIsListening(true);
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setSearchMessage("Voice search couldn’t start. Check microphone access and try again.");
    }
  }

  function confirmLogout() {
    clearCandidateSession();
    setShowLogoutConfirm(false);
    navigate("/", { replace: true });
  }

  function trackPointer(event) {
    if (event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const pointerX = ((event.clientX - bounds.left) / bounds.width - 0.5).toFixed(3);
    const pointerY = ((event.clientY - bounds.top) / bounds.height - 0.5).toFixed(3);
    event.currentTarget.style.setProperty("--pointer-x", `${Number(pointerX) * 15}px`);
    event.currentTarget.style.setProperty("--pointer-y", `${Number(pointerY) * 12}px`);
  }

  return (
    <div className={`app-shell ${location.pathname === "/home" ? "dashboard-shell" : ""}`} onPointerMove={trackPointer}>
      <div className="page-atmosphere" aria-hidden="true"><i className="atmosphere-glow" /><i className="atmosphere-orbit" /><i className="atmosphere-spark spark-a" /><i className="atmosphere-spark spark-b" /></div>
      <header className="app-sidebar" style={{ "--route-progress": `${((activeNavigationIndex + 1) / navigation.length) * 100}%` }}>
        <Link to="/home" className="brand-lockup">
          <span className="brand-mark"><BrandLogo /></span>
          <span>Interview<span className="brand-light">AI</span></span>
        </Link>
        <nav className="primary-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `nav-link ${isActive || (item.to === "/interviews" && ["/interview", "/results"].includes(location.pathname)) ? "active" : ""}`}>
              <Icon name={item.icon} /><span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="logout-link" onClick={() => setShowLogoutConfirm(true)}><Icon name="logout" size={18} />Log out</button>
        </div>
      </header>

      <div className="app-main">
        <header className="topbar">
          <form className="global-search-wrap" onSubmit={submitSearch}>
          <div className="global-search">
            <span className="search-leading"><Icon name="search" size={19} /></span>
            <input name="q" aria-label="Search interviews and questions" placeholder="Search interviews, questions, roles…" value={searchValue} onFocus={() => setSearchFocused(true)} onBlur={() => window.setTimeout(() => setSearchFocused(false), 120)} onChange={(event) => setSearchDraft({ locationSearch: search, value: event.target.value })} onKeyDown={() => setSearchMessage("")} />
            {searchValue && <button className="search-clear" type="button" aria-label="Clear search" onClick={() => { setSearchDraft({ locationSearch: search, value: "" }); setSearchMessage(""); performSearch(""); }}><span aria-hidden="true">×</span></button>}
            <button className={`search-voice ${isListening ? "is-listening" : ""}`} type="button" onClick={toggleVoiceSearch} aria-label={isListening ? "Stop voice search" : "Search by voice"} aria-pressed={isListening}><Icon name="microphone" size={19} /></button>
          </div>
          {searchFocused && <div className="search-suggestions" role="listbox" aria-label="Search destinations">
            {[ ["interviews", "Search interviews"], ["questions", "Search question bank"] ].map(([destination, label]) => <button type="button" role="option" key={destination} onMouseDown={(event) => event.preventDefault()} onClick={() => { const query = searchValue.trim(); navigate(query ? `/${destination}?q=${encodeURIComponent(query)}` : `/${destination}`); setSearchFocused(false); }}><span className="search-suggestion-icon"><Icon name={destination === "questions" ? "stack" : "file"} size={16} /></span><span>{label}<small>{searchValue ? ` for “${searchValue}”` : "Browse your saved practice"}</small></span><Icon name="arrow" size={15} /></button>)}
          </div>}
          </form>
          <Link to="/profile" className="topbar-user" aria-label="Open profile">
            <span>{profileName}</span>
            <span className="online-dot" aria-hidden="true" />
            <span className="avatar" aria-hidden="true" style={profileAvatar ? { backgroundImage: `url(${profileAvatar})`, backgroundPosition: "center", backgroundSize: "cover" } : undefined}>
              {!profileAvatar && (profileName[0] || "P").toUpperCase()}
            </span>
          </Link>
        </header>
        {searchMessage && <p className="search-message" role="status">{searchMessage}</p>}
        <main className="page-main">
          <div className="page-heading"><div><p className="eyebrow">{title[0]}</p>{title[1] && <h1>{title[1]}</h1>}</div></div>
          <div key={location.pathname} className="route-transition">{children}</div>
        </main>
      </div>
      {location.pathname === "/home" && <Link to="/create" className="floating-create-button"><span className="float-plus"><Icon name="edit" size={20} /></span><span>Create interview<small>Build a practice session</small></span><Icon name="arrow" size={17} /></Link>}
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
