"use client";

import Link from "next/link";
import { useGuestMatches } from "@/lib/use-guest-matches";

export function GuestCareerScore({ careerId }: { careerId: string }) {
  const { allMatches, assessmentReady, isLoading } = useGuestMatches(10);
  const match = allMatches.find((item) => item.id === careerId);

  if (match) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <div
          className="ring-score h-[92px] w-[92px] text-2xl"
          style={{ background: `radial-gradient(circle at center, #fff 60%, transparent 62%), conic-gradient(#7c3aed ${match.score}%, #ede9fe 0)` }}
        >
          {match.score}
        </div>
        <span className="text-xs font-bold uppercase tracking-wide text-slate-400">điểm phù hợp</span>
      </div>
    );
  }

  if (isLoading) {
    return <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">Đang tính điểm...</div>;
  }

  if (!assessmentReady) {
    return (
      <div className="max-w-[240px] rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-relaxed text-amber-800">
        Hoàn thành assessment dùng thử để xem điểm phù hợp cá nhân.
      </div>
    );
  }

  return null;
}

export function GuestCareerReasons({ careerId }: { careerId: string }) {
  const { allMatches } = useGuestMatches(10);
  const match = allMatches.find((item) => item.id === careerId);
  if (!match?.reasons.length) return null;

  return (
    <section className="card mb-4 p-6">
      <h2 className="m-0 font-display text-[17px] font-bold leading-tight tracking-tight text-slate-900">Lý do hệ thống gợi ý</h2>
      <ul className="m-0 mt-3 grid list-disc gap-1.5 pl-5 text-sm leading-relaxed text-slate-700">
        {match.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      <Link className="btn btn-secondary btn-sm mt-4" href="/explore">
        Xem toàn bộ gợi ý
      </Link>
    </section>
  );
}
