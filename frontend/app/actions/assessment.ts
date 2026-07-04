"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { cookies } from "next/headers";
import { API_BASE, API_TIMEOUT_MS } from "@/lib/api-config";
import { SESSION_COOKIE } from "@/lib/auth";

const assessmentSchema = z.object({
  name: z.string().min(2),
  gender: z.string().trim().min(1),
  gradeLevel: z.string().min(1),
  goals: z.string().trim().min(5),
  constraints: z.string().trim().min(1)
});

export async function submitAssessmentAction(formData: FormData) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return;

  const parsed = assessmentSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) return;

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
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.error("Assessment submit failed", await res.text());
      return;
    }
  } catch (e) {
    console.error("Fetch assessment submit error", e);
    return;
  }

  revalidatePath("/assessment");
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/explore");
  redirect("/profile");
}
