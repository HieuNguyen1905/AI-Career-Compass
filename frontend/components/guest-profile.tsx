"use client";

import Link from "next/link";
import { useGuestMatches } from "@/lib/use-guest-matches";
import { ProfileVectorSection } from "@/components/profile-vector-section";


export function GuestProfile() {
  const { profile, matches, assessmentReady, isLoading } = useGuestMatches(3);

  if (!assessmentReady || !profile) {
    return (
      <section className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 to-white p-6 shadow-sm">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="m-0 font-display text-xl font-bold leading-tight tracking-tight text-slate-900">Chưa có hồ sơ dùng thử</h2>
            <p className="m-0 mt-2 leading-relaxed text-slate-600">
              Hãy làm bài đánh giá để hệ thống tạo hồ sơ tạm thời.
            </p>
          </div>
          <Link className="btn btn-primary shrink-0" href="/assessment">
            Làm bài đánh giá
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="grid gap-4">
      <ProfileVectorSection profile={profile} />

      <section className="grid gap-4">
        <div className="mt-4 flex items-center justify-between gap-3">
          <h2 className="m-0 font-display text-xl font-bold leading-tight tracking-tight text-slate-900">Top gợi ý từ hồ sơ này</h2>
          <Link className="btn btn-secondary btn-sm" href="/explore">
            Xem đầy đủ
          </Link>
        </div>
        {isLoading && matches.length === 0 ? (
          <div className="card p-5 text-sm font-semibold text-slate-500">Đang tính gợi ý nghề nghiệp...</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {matches.map((match) => (
              <article className="card card-hover grid gap-3.5 p-5" key={match.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="chip-slate mb-1.5">{match.cluster}</span>
                    <h3 className="m-0 font-display font-bold leading-tight tracking-tight text-slate-900">{match.title}</h3>
                  </div>
                  <div
                    className="ring-score h-[58px] w-[58px] text-sm"
                    style={{ background: `radial-gradient(circle at center, #fff 58%, transparent 60%), conic-gradient(#0d9488 ${match.score}%, #e2e8f0 0)` }}
                  >
                    {match.score}
                  </div>
                </div>
                <p className="m-0 text-sm leading-relaxed text-slate-500">{match.reasons[0]}</p>
                <Link className="btn btn-secondary btn-sm mt-auto" href={`/careers/${match.id}`}>
                  Mở chi tiết nghề
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="mt-2">
        <Link className="btn btn-secondary" href="/assessment">
          Làm lại bài đánh giá
        </Link>
      </div>
    </div>
  );
}
