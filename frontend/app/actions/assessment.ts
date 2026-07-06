"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { cookies } from "next/headers";
import { API_BASE, ASSESSMENT_SUBMIT_TIMEOUT_MS } from "@/lib/api-config";
import { SESSION_COOKIE } from "@/lib/auth";

const assessmentSchema = z.object({
  name: z.string().min(2),
  gender: z.string().trim().min(1),
  gradeLevel: z.string().min(1),
  goals: z.string().trim().min(5),
  constraints: z.string().trim().min(1)
});

export type AssessmentActionState = {
  error: string | null;
};

async function readSubmitError(res: Response) {
  const fallback = "Không thể hoàn tất phân tích nghề nghiệp lúc này.";
  const body = await res.text().catch(() => "");
  if (!body) return fallback;

  try {
    const data = JSON.parse(body) as { detail?: unknown; error?: unknown };
    const message = typeof data.detail === "string" ? data.detail : data.error;
    return typeof message === "string" && message.trim() ? message : fallback;
  } catch {
    return body.trim() || fallback;
  }
}

export async function submitAssessmentAction(
  previousStateOrFormData: AssessmentActionState | FormData,
  maybeFormData?: FormData
): Promise<AssessmentActionState> {
  const formData = maybeFormData ?? (previousStateOrFormData instanceof FormData ? previousStateOrFormData : null);
  if (!formData) {
    return { error: "Không nhận được dữ liệu assessment. Vui lòng thử nộp lại." };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return { error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." };
  }

  const parsed = assessmentSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: "Vui lòng kiểm tra lại thông tin cá nhân trước khi nộp assessment." };
  }

  // We need all answers from formData (keys start with q_)
  const answers: Record<string, number> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("q_")) {
      const rawScore = Number(value);
      answers[key] = Number.isFinite(rawScore) ? Math.max(1, Math.min(5, rawScore)) : 3;
    }
  }

  try {
    const res = await fetch(`${API_BASE}/assessment/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        name: parsed.data.name,
        gender: parsed.data.gender,
        gradeLevel: parsed.data.gradeLevel,
        goals: parsed.data.goals,
        constraints: parsed.data.constraints,
        answers
      }),
      signal: AbortSignal.timeout(ASSESSMENT_SUBMIT_TIMEOUT_MS),
    });

    if (!res.ok) {
      const message = await readSubmitError(res);
      console.error("Assessment submit failed", message);
      return { error: message };
    }
  } catch (e) {
    console.error("Fetch assessment submit error", e);
    const isTimeout = e instanceof DOMException && e.name === "TimeoutError";
    return {
      error: isTimeout
        ? "AI đang phân tích quá lâu. Vui lòng thử nộp lại để hệ thống tạo giải thích thật."
        : "Không thể kết nối đến máy chủ phân tích.",
    };
  }

  revalidatePath("/assessment");
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/explore");
  redirect("/profile");
}
