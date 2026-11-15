import axios from "axios";

// Vite variables are embedded at build time. Never silently point a deployed
// build at the visitor's own localhost machine.
const configuredBaseURL = import.meta.env.VITE_API_BASE_URL?.trim();
export const productionAPIConfigured = Boolean(configuredBaseURL) || !import.meta.env.PROD;
const baseURL = configuredBaseURL || (import.meta.env.PROD ? "" : "http://localhost:8000");

const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

export default apiClient;
