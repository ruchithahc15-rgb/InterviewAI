import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useLocation, useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import { saveCandidateSession } from "../api/session";
import { firebaseAuth, firebaseConfigured } from "../api/firebase";
import { productionAPIConfigured } from "../api/client";

export default function GoogleAuthButton({ onError, remember = false, onBusyChange = () => {} }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);

  async function signInWithGoogle() {
    if (!firebaseAuth) {
      onError("Google sign-in is not configured for this app yet.");
      return;
    }
    if (!productionAPIConfigured) {
      onError("This deployed app is missing VITE_API_BASE_URL. Add your public backend URL in Vercel and redeploy.");
      return;
    }
    onError("");
    setBusy(true);
    onBusyChange(true);
    try {
      const result = await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
      const idToken = await result.user.getIdToken();
      const { data } = await apiClient.post("/candidates/google-login", { id_token: idToken });
      saveCandidateSession(data.candidate_id, remember);
      try { localStorage.setItem("candidateName", data.name || ""); } catch { /* Session remains available. */ }
      navigate(location.state?.from || "/welcome", { replace: true });
    } catch (error) {
      const message = error.response?.data?.detail
        || (error.code === "auth/popup-closed-by-user" ? "Google sign-in was closed before it finished."
            : error.code === "auth/unauthorized-domain" ? `Add ${window.location.hostname} to Firebase Authentication → Settings → Authorized domains.`
            : error.message || "Google sign-in could not be completed. Please try again.");
      onError(message);
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }

  return <button type="button" className="google-auth-button" onClick={signInWithGoogle} disabled={busy || !firebaseConfigured} title={!firebaseConfigured ? "Firebase web configuration is missing" : undefined}>
    <svg className="google-mark" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11c-.5 2.5-1.9 4.6-4 6l6.4 5c4-3.7 6.2-9.1 6.2-14.7Z" />
      <path fill="#34A853" d="M24 44c5.6 0 10.4-1.9 13.8-5l-6.4-5c-1.8 1.2-4.2 2-7.4 2-5.7 0-10.5-3.8-12.2-8.9l-6.6 5.1C8.6 39.2 15.7 44 24 44Z" />
      <path fill="#FBBC05" d="M11.8 27.1a12.1 12.1 0 0 1 0-7.7l-6.6-5.1a20 20 0 0 0 0 17.9l6.6-5.1Z" />
      <path fill="#EA4335" d="M24 10.5c3.1 0 5.9 1.1 8.1 3.2l6-5.9C34.5 4.5 29.6 2 24 2 15.7 2 8.6 6.8 5.2 14.3l6.6 5.1c1.7-5.1 6.5-8.9 12.2-8.9Z" />
    </svg>{busy ? "Connecting to Google…" : "Continue with Google"}
  </button>;
}
