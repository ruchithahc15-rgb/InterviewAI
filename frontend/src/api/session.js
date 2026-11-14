let volatileCandidateId = null;

export function getCandidateId() {
  try { return localStorage.getItem("candidateId") || sessionStorage.getItem("candidateId") || volatileCandidateId; }
  catch { return volatileCandidateId; }
}

export function saveCandidateSession(candidateId, remember = false) {
  volatileCandidateId = String(candidateId);
  try {
    localStorage.removeItem("candidateId");
    sessionStorage.removeItem("candidateId");
    (remember ? localStorage : sessionStorage).setItem("candidateId", candidateId);
  } catch {
    try { sessionStorage.setItem("candidateId", candidateId); } catch { /* Keep the in-memory session. */ }
  }
}

export function clearCandidateSession() {
  volatileCandidateId = null;
  try { localStorage.removeItem("candidateId"); localStorage.removeItem("candidateName"); } catch { /* Storage may be blocked. */ }
  try { sessionStorage.removeItem("candidateId"); } catch { /* Storage may be blocked. */ }
}
