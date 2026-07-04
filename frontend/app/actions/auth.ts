"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { API_BASE, AUTH_TIMEOUT_MS } from "@/lib/api-config";
import { clearSession, createSession, getCurrentUser } from "@/lib/auth";

type AuthState = {
  error?: string;
};

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  gradeLevel: z.string().min(1)
});

export async function loginAction(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: "Email hoặc mật khẩu không hợp lệ." };
  }

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return { error: errorData.detail || "Email hoặc mật khẩu không đúng." };
    }

    const data = await res.json();
    await createSession(data.access_token);
  } catch {
    return { error: "Không thể kết nối đến máy chủ." };
  }
  
  redirect("/dashboard");
}

export async function registerAction(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: "Vui lòng nhập tên, email, lớp và mật khẩu tối thiểu 6 ký tự." };
  }

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return { error: errorData.detail || "Tài khoản không hợp lệ hoặc đã tồn tại." };
    }

    const data = await res.json();
    await createSession(data.access_token);
  } catch {
    return { error: "Không thể kết nối đến máy chủ." };
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  const user = await getCurrentUser();
  if (user) {
    await clearSession();
  }
  redirect("/login");
}
