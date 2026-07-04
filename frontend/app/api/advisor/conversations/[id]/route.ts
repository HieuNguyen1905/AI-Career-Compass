import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { API_BASE, API_TIMEOUT_MS } from "@/lib/api-config";
import { SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const res = await fetch(`${API_BASE}/advisor/conversations/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(API_TIMEOUT_MS)
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.detail || "Server error" }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Advisor conversation detail proxy error", error);
    return NextResponse.json({ error: "Không thể kết nối đến máy chủ AI." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const res = await fetch(`${API_BASE}/advisor/conversations/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(API_TIMEOUT_MS)
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.detail || "Server error" }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Advisor conversation delete proxy error", error);
    return NextResponse.json({ error: "Không thể kết nối đến máy chủ AI." }, { status: 500 });
  }
}
