import "server-only";
import { cache } from "react";

import { cookies } from "next/headers";
import { hasCompletedCurrentAssessment } from "@/lib/assessment-status";
import { API_BASE, API_TIMEOUT_MS, CAREER_MATCH_TIMEOUT_MS } from "@/lib/api-config";
import { SESSION_COOKIE } from "@/lib/auth";
import type { CareerMatch, CareerPath, CareerProfile, MockUser } from "@/lib/types";
export type { CareerMatch } from "@/lib/types";

type ApiDate = string | Date;

type ApiUser = Omit<MockUser, "name" | "createdAt" | "updatedAt"> & {
  name?: unknown;
  createdAt: ApiDate;
  updatedAt: ApiDate;
};

type ApiProfile = Omit<
  CareerProfile,
  | "gradeLevel"
  | "interests"
  | "strengths"
  | "favoriteSubjects"
  | "values"
  | "riasec"
  | "goals"
  | "constraints"
  | "assessmentCompleted"
  | "assessmentAnswers"
  | "createdAt"
  | "updatedAt"
> & {
  gradeLevel?: unknown;
  interests?: unknown;
  strengths?: unknown;
  favoriteSubjects?: unknown;
  values?: unknown;
  riasec?: unknown;
  goals?: unknown;
  constraints?: unknown;
  assessmentCompleted?: unknown;
  assessmentAnswers?: unknown;
  createdAt: ApiDate;
  updatedAt: ApiDate;
};

type ApiCareer = Omit<
  CareerPath,
  | "title"
  | "cluster"
  | "summary"
  | "subjects"
  | "jobSkills"
  | "majors"
  | "activities"
  | "jobTasks"
  | "featureVector"
  | "featureVectorUpdatedAt"
  | "createdAt"
  | "updatedAt"
> & {
  title?: unknown;
  cluster?: unknown;
  summary?: unknown;
  subjects?: unknown;
  jobSkills?: unknown;
  majors?: unknown;
  activities?: unknown;
  jobTasks?: unknown;
  featureVector?: unknown;
  featureVectorUpdatedAt?: ApiDate | null;
  createdAt: ApiDate;
  updatedAt: ApiDate;
};

type ApiCareerMatch = ApiCareer & {
  score?: unknown;
  reasons?: unknown;
};

const MOJIBAKE_RE = /[\u00c2\u00c3\u00c4\u00c6]|\u00e1[\u00ba\u00bb]|\u00e2[\u0080-\u009f\u20ac]|\u00f0\u0178/;
const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });
const CP1252_EXTRA_BYTES: Record<string, number> = {
  "\u20ac": 0x80,
  "\u201a": 0x82,
  "\u0192": 0x83,
  "\u201e": 0x84,
  "\u2026": 0x85,
  "\u2020": 0x86,
  "\u2021": 0x87,
  "\u02c6": 0x88,
  "\u2030": 0x89,
  "\u0160": 0x8a,
  "\u2039": 0x8b,
  "\u0152": 0x8c,
  "\u017d": 0x8e,
  "\u2018": 0x91,
  "\u2019": 0x92,
  "\u201c": 0x93,
  "\u201d": 0x94,
  "\u2022": 0x95,
  "\u2013": 0x96,
  "\u2014": 0x97,
  "\u02dc": 0x98,
  "\u2122": 0x99,
  "\u0161": 0x9a,
  "\u203a": 0x9b,
  "\u0153": 0x9c,
  "\u017e": 0x9e,
  "\u0178": 0x9f,
};

function repairText(value: string) {
  if (!MOJIBAKE_RE.test(value)) return value;

  const bytes: number[] = [];
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code <= 0xff) {
      bytes.push(code);
      continue;
    }

    const cp1252Byte = CP1252_EXTRA_BYTES[char];
    if (cp1252Byte == null) return value;
    bytes.push(cp1252Byte);
  }

  try {
    return UTF8_DECODER.decode(Uint8Array.from(bytes));
  } catch {
    return value;
  }
}

function repairList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => repairText(String(item)));
}

function repairVector(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  return value.map(Number).filter(Number.isFinite);
}

function repairAssessmentAnswers(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, score]) => [key, Number(score)] as const)
      .filter(([, score]) => Number.isFinite(score))
  );
}

async function tokenHeader(): Promise<Record<string, string>> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJson<T>(
  endpoint: string,
  authenticated = false,
  revalidate?: number,
  timeoutMs = API_TIMEOUT_MS
): Promise<T | null> {
  try {
    const headers: HeadersInit = authenticated ? await tokenHeader() : {};
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers,
      signal: AbortSignal.timeout(timeoutMs),
      ...(revalidate != null
        ? { next: { revalidate } }
        : { cache: "no-store" as const }),
    });

    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch (error) {
    console.error(`Data fetch failed: ${endpoint}`, error);
    return null;
  }
}

function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}

function mapUser(user: ApiUser): MockUser {
  return {
    ...user,
    name: repairText(String(user.name ?? "")),
    createdAt: toDate(user.createdAt),
    updatedAt: toDate(user.updatedAt),
  };
}

function mapProfile(profile: ApiProfile): CareerProfile {
  return {
    ...profile,
    gradeLevel: repairText(String(profile.gradeLevel ?? "")),
    gender: profile.gender == null ? null : repairText(String(profile.gender)),
    interests: repairList(profile.interests),
    strengths: repairList(profile.strengths),
    favoriteSubjects: repairList(profile.favoriteSubjects),
    values: repairList(profile.values),
    riasec: repairList(profile.riasec),
    goals: repairText(String(profile.goals ?? "")),
    constraints: repairText(String(profile.constraints ?? "")),
    assessmentAnswers: repairAssessmentAnswers(profile.assessmentAnswers),
    assessmentCompleted: Boolean(profile.assessmentCompleted),
    createdAt: toDate(profile.createdAt),
    updatedAt: toDate(profile.updatedAt),
  };
}

function mapCareer(career: ApiCareer): CareerPath {
  return {
    ...career,
    title: repairText(String(career.title ?? "")),
    cluster: repairText(String(career.cluster ?? "")),
    summary: repairText(String(career.summary ?? "")),
    subjects: repairList(career.subjects),
    jobSkills: repairList(career.jobSkills),
    majors: repairList(career.majors),
    activities: repairList(career.activities),
    jobTasks: repairList(career.jobTasks),
    featureVector: repairVector(career.featureVector),
    featureVectorUpdatedAt: career.featureVectorUpdatedAt ? toDate(career.featureVectorUpdatedAt) : null,
    createdAt: toDate(career.createdAt),
    updatedAt: toDate(career.updatedAt),
  };
}

export const listUsers = cache(async () => {
  const users = await fetchJson<ApiUser[]>("/admin/users", true);
  return (users ?? []).map(mapUser);
});

export const listProfiles = cache(async () => {
  const profiles = await fetchJson<ApiProfile[]>("/admin/profiles", true);
  return (profiles ?? []).map(mapProfile);
});

export const listTopClusters = cache(async () => {
  const clusters = await fetchJson<Record<string, number>>("/admin/top-clusters", true);
  return clusters ?? {};
});

export const getProfileByUserId = cache(async (userId: string) => {
  const profile = await fetchJson<ApiProfile>("/profile/", true);
  if (!profile || profile.userId !== userId) return null;
  return mapProfile(profile);
});

export const getMyProfile = cache(async () => {
  const profile = await fetchJson<ApiProfile>("/profile/", true);
  if (!profile) return null;
  return mapProfile(profile);
});

export const listCareers = cache(async () => {
  const careers = await fetchJson<ApiCareer[]>("/careers/", false, 300);
  return (careers ?? []).map(mapCareer);
});

export const getCareerById = cache(async (careerId: string) => {
  const career = await fetchJson<ApiCareer>(`/careers/${careerId}`, false, 300);
  return career ? mapCareer(career) : null;
});

export const listCareerMatches = cache(async (
  explain = true,
  limit?: number,
  timeoutMs = explain ? CAREER_MATCH_TIMEOUT_MS : API_TIMEOUT_MS
): Promise<CareerMatch[]> => {
  const profile = await getMyProfile();
  if (!hasCompletedCurrentAssessment(profile)) return [];

  const params = new URLSearchParams();
  if (!explain) params.set("explain", "false");
  if (limit != null) params.set("limit", String(limit));

  const query = params.toString();
  const endpoint = `/careers/matches${query ? `?${query}` : ""}`;
  const matches = await fetchJson<ApiCareerMatch[]>(endpoint, true, undefined, timeoutMs);
  if (!Array.isArray(matches)) return [];

  return matches.map((match) => ({
    ...mapCareer(match),
    score: typeof match.score === "number" ? match.score : 0,
    reasons: repairList(match.reasons),
  }));
});
