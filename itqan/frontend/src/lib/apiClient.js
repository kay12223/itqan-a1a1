import axios from "axios";

const BACKEND_URL = "https://itqan-a1a1-production.up.railway.app";
export const API_BASE = `${BACKEND_URL}/api`;
const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("itqan_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function apiErr(detail) {
  if (detail == null) return "حدث خطأ ما، حاول مجدداً";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export default api;
