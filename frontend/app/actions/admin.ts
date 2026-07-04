"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { API_BASE, API_TIMEOUT_MS } from "@/lib/api-config";
import { requireRole, Role, UserStatus } from "@/lib/auth";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth";

const roleSchema = z.enum([Role.ADMIN, Role.STUDENT]);
const statusSchema = z.enum([UserStatus.ACTIVE, UserStatus.DISABLED]);

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: roleSchema,
  gradeLevel: z.string().optional()
});

const updateUserSchema = z.object({
  role: roleSchema,
  status: statusSchema,
  gradeLevel: z.string().optional()
});

const careerSchema = z.object({
  title: z.string().min(2),
  cluster: z.string().min(2),
  summary: z.string().min(10),
  subjects: z.string(),
  jobSkills: z.string(),
  majors: z.string(),
  jobTasks: z.string(),
  activities: z.string(),
});

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCareer(formData: FormData) {
  const parsed = careerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return null;

  return {
    title: parsed.data.title,
    cluster: parsed.data.cluster,
    summary: parsed.data.summary,
    subjects: splitList(parsed.data.subjects),
    jobSkills: splitList(parsed.data.jobSkills),
    majors: splitList(parsed.data.majors),
    activities: splitList(parsed.data.activities),
    jobTasks: splitList(parsed.data.jobTasks)
  };
}

function revalidateAdminSurfaces() {
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/admin/careers");
  revalidatePath("/dashboard");
  revalidatePath("/explore");
}

async function fetchAPI(endpoint: string, method: string, body?: unknown) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(API_TIMEOUT_MS)
    });
    return res.ok;
  } catch (e) {
    console.error(`Fetch API failed: ${endpoint}`, e);
    return false;
  }
}

export async function createUserAction(formData: FormData) {
  await requireRole([Role.ADMIN]);
  const parsed = createUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const success = await fetchAPI(`/admin/users`, "POST", {
    ...parsed.data,
    gradeLevel: parsed.data.gradeLevel || undefined
  });
  if (success) {
    revalidateAdminSurfaces();
  }
}

export async function updateUserAction(userId: string, formData: FormData) {
  await requireRole([Role.ADMIN]);
  const parsed = updateUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const success = await fetchAPI(`/admin/users/${userId}`, "PUT", {
    ...parsed.data,
    gradeLevel: parsed.data.gradeLevel || undefined
  });
  if (success) {
    revalidateAdminSurfaces();
  }
}

export async function deleteUserAction(userId: string) {
  const currentUser = await requireRole([Role.ADMIN]);
  if (currentUser.id === userId) return;

  const success = await fetchAPI(`/admin/users/${userId}`, "DELETE");
  if (success) {
    revalidateAdminSurfaces();
  }
}

export async function createCareerAction(formData: FormData) {
  await requireRole([Role.ADMIN]);
  const career = parseCareer(formData);
  if (!career) return;

  const success = await fetchAPI(`/admin/careers`, "POST", career);
  if (success) {
    revalidateAdminSurfaces();
  }
}

export async function updateCareerAction(careerId: string, formData: FormData) {
  await requireRole([Role.ADMIN]);
  const career = parseCareer(formData);
  if (!career) return;

  const success = await fetchAPI(`/admin/careers/${careerId}`, "PUT", career);
  if (success) {
    revalidateAdminSurfaces();
  }
}

export async function deleteCareerAction(careerId: string) {
  await requireRole([Role.ADMIN]);
  const success = await fetchAPI(`/admin/careers/${careerId}`, "DELETE");
  if (success) {
    revalidateAdminSurfaces();
  }
}
