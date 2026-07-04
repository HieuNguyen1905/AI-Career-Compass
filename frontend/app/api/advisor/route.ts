import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { API_BASE } from "@/lib/api-config";
import { SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  try {
    const body = await request.json().catch(() => null);
    const endpoint = token ? "/advisor/chat/stream" : "/advisor/guest/chat/stream";
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: data.detail || "Server error" },
        { status: res.status || 500 }
      );
    }

    return new Response(res.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("Advisor proxy error", error);
    return NextResponse.json({ error: "Không thể kết nối đến máy chủ AI." }, { status: 500 });
  }
}
