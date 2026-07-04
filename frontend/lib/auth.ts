import "server-only";
import { cache } from "react";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_BASE, AUTH_TIMEOUT_MS } from "@/lib/api-config";
import { Role, UserStatus } from "@/lib/types";
export { Role, UserStatus };

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  gradeLevel?: string;
  gender?: string;
};

export const SESSION_COOKIE = "career_copilot_session";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;


export async function createSession(token: string) {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/"
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        "Authorization": `Bearer ${token}`
      },
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS)
    });

    if (!res.ok) return null;
    const user = await res.json();
    if (user.status !== UserStatus.ACTIVE) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      gradeLevel: user.gradeLevel,
      gender: user.gender
    };
  } catch (e) {
    console.error("Failed to fetch current user", e);
    return null;
  }
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/dashboard");
  return user;
}

export function makeGuestUser(): SessionUser {
  return {
    id: "guest_user",
    email: "guest@session.local",
    name: "Học sinh dùng thử",
    role: Role.GUEST,
    status: UserStatus.ACTIVE,
    gradeLevel: "11",
  };
}

export function canManageUsers(role: Role) {
  return role === Role.ADMIN;
}

export function canViewAllStudents(role: Role) {
  return role === Role.ADMIN;
}
