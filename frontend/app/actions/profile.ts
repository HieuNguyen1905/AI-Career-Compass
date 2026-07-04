"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { cookies } from "next/headers";
import { API_BASE, API_TIMEOUT_MS } from "@/lib/api-config";
import { SESSION_COOKIE } from "@/lib/auth";

const profileSchema = z.object({
  name: z.string().min(2),
  gender: z.string().optional().nullable(),
  gradeLevel: z.string().optional().nullable(),
  goals: z.string().optional().nullable(),
  constraints: z.string().optional().nullable(),
});

export async function updateProfileAction(formData: FormData) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return;

  const parsed = profileSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) return;

  try {
    const res = await fetch(`${API_BASE}/profile/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
      body: JSON.stringify(parsed.data),
    });

    if (!res.ok) {
      console.error("Profile update failed", await res.text());
      return;
    }
  } catch (e) {
    console.error("Fetch profile update error", e);
    return;
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/explore");
  redirect("/profile");
}
