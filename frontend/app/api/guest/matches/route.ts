import { NextResponse } from "next/server";
import { API_BASE, CAREER_MATCH_TIMEOUT_MS } from "@/lib/api-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const res = await fetch(`${API_BASE}/careers/guest/matches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(CAREER_MATCH_TIMEOUT_MS),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ error: data.detail || "Server error" }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Guest matches proxy error", error);
    return NextResponse.json({ error: "Không thể tính gợi ý nghề nghiệp lúc này." }, { status: 500 });
  }
}
