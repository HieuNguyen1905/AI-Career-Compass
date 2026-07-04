"use client";

import { assessmentQuestions } from "@/lib/assessment-questions";
import type { CareerMatch, CareerPath, CareerProfile } from "@/lib/types";

export const GUEST_SESSION_STORAGE_KEY = "career_compass_guest_session";
export const GUEST_SESSION_TTL_MS = 2 * 60 * 60 * 1000;
export const GUEST_USER_ID = "guest_user";
export const GUEST_USER_EMAIL = "guest@session.local";
export const GUEST_USER_NAME = "Học sinh dùng thử";

const GUEST_SESSION_VERSION = 1;
const MAX_GUEST_CONVERSATIONS = 20;
const MAX_GUEST_MESSAGES = 40;

export type GuestAssessmentDraft = {
  name: string;
  gender: string;
  gradeLevel: string;
  goals: string;
  constraints: string;
  answers: Record<string, number>;
};

export type GuestChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  createdAt: string;
};

export type GuestChatConversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: GuestChatMessage[];
};

export type GuestConversationSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessage: string;
};

type GuestSessionData = {
  version: number;
  updatedAt: number;
  expiresAt: number;
  assessmentDraft?: GuestAssessmentDraft;
  profile?: unknown;
  matches?: unknown[];
  chat?: {
    activeId?: string | null;
    conversations: GuestChatConversation[];
  };
};

function getSessionStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function blankSession(): GuestSessionData {
  const now = Date.now();
  return {
    version: GUEST_SESSION_VERSION,
    updatedAt: now,
    expiresAt: now + GUEST_SESSION_TTL_MS,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toDate(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value ?? ""));
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item));
}

function asAnswers(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, score]) => [key, Number(score)] as const)
      .filter(([, score]) => Number.isInteger(score) && score >= 1 && score <= 5)
  );
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function hydrateCareer(raw: unknown): CareerPath | null {
  if (!isRecord(raw)) return null;

  return {
    id: asString(raw.id),
    title: asString(raw.title),
    cluster: asString(raw.cluster),
    summary: asString(raw.summary),
    subjects: asStringArray(raw.subjects),
    jobSkills: asStringArray(raw.jobSkills),
    majors: asStringArray(raw.majors),
    activities: asStringArray(raw.activities),
    jobTasks: asStringArray(raw.jobTasks),
    onetCode: raw.onetCode == null ? null : String(raw.onetCode),
    featureVector: Array.isArray(raw.featureVector) ? raw.featureVector.map(Number).filter(Number.isFinite) : null,
    featureVectorVersion: raw.featureVectorVersion == null ? null : String(raw.featureVectorVersion),
    featureVectorUpdatedAt: raw.featureVectorUpdatedAt ? toDate(raw.featureVectorUpdatedAt) : null,
    createdAt: toDate(raw.createdAt),
    updatedAt: toDate(raw.updatedAt),
  };
}

export function hydrateGuestProfile(raw: unknown): CareerProfile | null {
  if (!isRecord(raw)) return null;

  return {
    id: asString(raw.id, "guest_profile"),
    userId: asString(raw.userId, GUEST_USER_ID),
    gradeLevel: asString(raw.gradeLevel, "11"),
    interests: asStringArray(raw.interests),
    strengths: asStringArray(raw.strengths),
    favoriteSubjects: asStringArray(raw.favoriteSubjects),
    values: asStringArray(raw.values),
    riasec: asStringArray(raw.riasec),
    goals: asString(raw.goals),
    constraints: asString(raw.constraints),
    assessmentCompleted: Boolean(raw.assessmentCompleted),
    assessmentAnswers: asAnswers(raw.assessmentAnswers),
    createdAt: toDate(raw.createdAt),
    updatedAt: toDate(raw.updatedAt),
  };
}

export function hydrateGuestMatch(raw: unknown): CareerMatch | null {
  if (!isRecord(raw)) return null;
  const career = hydrateCareer(raw);
  if (!career) return null;

  return {
    ...career,
    score: Number.isFinite(Number(raw.score)) ? Number(raw.score) : 0,
    reasons: asStringArray(raw.reasons),
  };
}

export function readGuestSession(): GuestSessionData | null {
  const storage = getSessionStorage();
  if (!storage) return null;

  const raw = storage.getItem(GUEST_SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as GuestSessionData;
    if (!parsed || typeof parsed.expiresAt !== "number" || Date.now() > parsed.expiresAt) {
      storage.removeItem(GUEST_SESSION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    storage.removeItem(GUEST_SESSION_STORAGE_KEY);
    return null;
  }
}

function writeGuestSession(nextSession: GuestSessionData) {
  const storage = getSessionStorage();
  if (!storage) return;

  const now = Date.now();
  storage.setItem(
    GUEST_SESSION_STORAGE_KEY,
    JSON.stringify({
      ...nextSession,
      version: GUEST_SESSION_VERSION,
      updatedAt: now,
      expiresAt: now + GUEST_SESSION_TTL_MS,
    })
  );
}

export function updateGuestSession(updater: (current: GuestSessionData) => GuestSessionData) {
  writeGuestSession(updater(readGuestSession() ?? blankSession()));
}

export function clearGuestSession() {
  const storage = getSessionStorage();
  storage?.removeItem(GUEST_SESSION_STORAGE_KEY);
}

export function loadGuestAssessmentDraft(): GuestAssessmentDraft | null {
  const session = readGuestSession();
  if (session?.assessmentDraft) return session.assessmentDraft;

  const profile = hydrateGuestProfile(session?.profile);
  if (!profile) return null;

  return {
    name: GUEST_USER_NAME,
    gender: "",
    gradeLevel: profile.gradeLevel,
    goals: profile.goals,
    constraints: profile.constraints,
    answers: profile.assessmentAnswers,
  };
}

export function saveGuestAssessmentDraft(draft: GuestAssessmentDraft) {
  updateGuestSession((session) => ({
    ...session,
    assessmentDraft: {
      ...draft,
      answers: asAnswers(draft.answers),
    },
  }));
}

export function loadGuestProfile(): CareerProfile | null {
  return hydrateGuestProfile(readGuestSession()?.profile);
}

export function saveGuestProfile(profile: CareerProfile) {
  updateGuestSession((session) => {
    const nextSession = {
      ...session,
      profile,
      assessmentDraft: {
        ...(session.assessmentDraft ?? {
          name: GUEST_USER_NAME,
          gender: "",
          gradeLevel: profile.gradeLevel,
          goals: profile.goals,
          constraints: profile.constraints,
        }),
        gradeLevel: profile.gradeLevel,
        goals: profile.goals,
        constraints: profile.constraints,
        answers: profile.assessmentAnswers,
      },
    };
    delete nextSession.matches;
    return nextSession;
  });
}

export function loadGuestMatches(): CareerMatch[] {
  const rawMatches = readGuestSession()?.matches;
  if (!Array.isArray(rawMatches)) return [];
  return rawMatches.map(hydrateGuestMatch).filter((match): match is CareerMatch => Boolean(match));
}

export function saveGuestMatches(matches: CareerMatch[]) {
  updateGuestSession((session) => ({
    ...session,
    matches,
  }));
}

export function clearGuestMatches() {
  updateGuestSession((session) => {
    const nextSession = { ...session };
    delete nextSession.matches;
    return nextSession;
  });
}

export function guestHasCompletedCurrentAssessment(profile: CareerProfile | null | undefined) {
  const answers = profile?.assessmentAnswers;
  if (!profile?.assessmentCompleted || !answers) return false;

  let hasNonNeutralAnswer = false;
  const hasAllCurrentAnswers = assessmentQuestions.every((question) => {
    const score = answers[question.id];
    const isValid = Number.isInteger(score) && score >= 1 && score <= 5;
    if (isValid && score !== 3) hasNonNeutralAnswer = true;
    return isValid;
  });

  return hasAllCurrentAnswers && hasNonNeutralAnswer;
}

export function loadGuestChatState() {
  const chat = readGuestSession()?.chat;
  return {
    activeId: chat?.activeId ?? null,
    conversations: Array.isArray(chat?.conversations) ? chat.conversations : [],
  };
}

export function loadGuestConversation(id: string) {
  return loadGuestChatState().conversations.find((conversation) => conversation.id === id) ?? null;
}

export function loadGuestConversationSummaries(): GuestConversationSummary[] {
  return loadGuestChatState().conversations.map((conversation) => ({
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    lastMessage: conversation.messages.at(-1)?.content.slice(0, 120) ?? "",
  }));
}

export function saveGuestConversation(conversation: GuestChatConversation, activeId: string | null = conversation.id) {
  updateGuestSession((session) => {
    const existing = session.chat?.conversations ?? [];
    const conversations = [
      {
        ...conversation,
        messages: conversation.messages.slice(-MAX_GUEST_MESSAGES),
      },
      ...existing.filter((item) => item.id !== conversation.id),
    ]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, MAX_GUEST_CONVERSATIONS);

    return {
      ...session,
      chat: {
        activeId,
        conversations,
      },
    };
  });
}

export function setGuestActiveConversation(activeId: string | null) {
  updateGuestSession((session) => ({
    ...session,
    chat: {
      activeId,
      conversations: session.chat?.conversations ?? [],
    },
  }));
}

export function deleteGuestConversation(id: string) {
  updateGuestSession((session) => {
    const conversations = (session.chat?.conversations ?? []).filter((conversation) => conversation.id !== id);
    return {
      ...session,
      chat: {
        activeId: session.chat?.activeId === id ? null : session.chat?.activeId ?? null,
        conversations,
      },
    };
  });
}

export function clearGuestChat() {
  updateGuestSession((session) => ({
    ...session,
    chat: {
      activeId: null,
      conversations: [],
    },
  }));
}
