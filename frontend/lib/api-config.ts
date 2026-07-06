import "server-only";

export const API_BASE = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
export const API_TIMEOUT_MS = Number(process.env.API_TIMEOUT_MS ?? "15000");
export const AUTH_TIMEOUT_MS = Number(process.env.AUTH_TIMEOUT_MS ?? "5000");
export const CAREER_MATCH_TIMEOUT_MS = Number(process.env.CAREER_MATCH_TIMEOUT_MS ?? "35000");
export const ASSESSMENT_SUBMIT_TIMEOUT_MS = Number(process.env.ASSESSMENT_SUBMIT_TIMEOUT_MS ?? "45000");
