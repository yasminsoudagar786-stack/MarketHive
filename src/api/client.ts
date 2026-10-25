import axios from "axios";
import { useAuth } from "@/stores/auth";

export const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? "true") !== "false";

export const http = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000/api" });

http.interceptors.request.use((config) => {
  const token = useAuth.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
http.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) useAuth.getState().logout();
    return Promise.reject(err);
  },
);

export class ApiError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

/** Simulate network latency and occasional failures in mock mode. */
export async function mock<T>(fn: () => T, { failRate = 0.03, ms = 350 } = {}): Promise<T> {
  await new Promise((res) => setTimeout(res, ms + Math.random() * 300));
  if (Math.random() < failRate) throw new ApiError("Network hiccup — please retry", 503);
  return structuredClone(fn());
}
