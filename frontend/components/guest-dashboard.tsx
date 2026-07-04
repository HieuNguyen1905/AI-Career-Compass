"use client";

import { ArrowRight, BarChart3, Bot, ClipboardList, Compass } from "lucide-react";
import Link from "next/link";
import { useGuestMatches } from "@/lib/use-guest-matches";
import type { CareerProfile } from "@/lib/types";

function completeness(profile: CareerProfile | null, assessmentReady: boolean) {
  if (!profile) return 0;
  const checks = [
    assessmentReady,
    profile.interests.length > 0,
    profile.strengths.length > 0,
    profile.favoriteSubjects.length > 0,
    profile.values.length > 0,
    profile.riasec.length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function GuestDashboard() {
  const { profile, matches, assessmentReady, isLoading } = useGuestMatches(3);
  const profileCompleteness = completeness(profile, assessmentReady);

  return (
    <div className="grid gap-6">
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[
          { label: "Bài đánh giá", value: assessmentReady ? "Đã xong" : "Bắt đầu", icon: ClipboardList, tone: "from-teal-500 to-emerald-400" },
          { label: "Mức hoàn thiện hồ sơ", value: `${profileCompleteness}%`, icon: BarChart3, tone: "from-sky-500 to-cyan-400" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card card-hover flex items-start justify-between gap-3 p-5">
              <div>
                <span className="block text-[13px] font-medium text-slate-500">{stat.label}</span>
                <strong className="mt-2 block font-display text-2xl font-extrabold leading-none tracking-tight text-slate-900">{stat.value}</strong>
              </div>
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${stat.tone} text-white shadow-lg`}>
                <Icon size={22} aria-hidden />
              </span>
            </div>
          );
        })}
      </section>

      {!assessmentReady ? (
        <section className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 to-white p-6 shadow-sm">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="m-0 font-display text-xl font-bold leading-tight tracking-tight text-slate-900">Bạn đang ở chế độ dùng thử</h2>
              <p className="m-0 mt-2 max-w-2xl leading-relaxed text-slate-600">
                Trả lời bài đánh giá để tạo hồ sơ và gợi ý nghề.
              </p>
            </div>
            <Link className="btn btn-primary shrink-0" href="/assessment">
              Làm bài đánh giá
              <ArrowRight size={18} aria-hidden />
            </Link>
          </div>
        </section>
      ) : null}

      {assessmentReady ? (
        <section className="grid gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="m-0 font-display text-xl font-bold leading-tight tracking-tight text-slate-900">Top hướng nghề gần nhất</h2>
            <Link className="btn btn-secondary btn-sm" href="/explore">
              Xem tất cả
              <ArrowRight size={16} aria-hidden />
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
                      style={{
                        background: `radial-gradient(circle at center, #fff 58%, transparent 60%), conic-gradient(#0d9488 ${match.score}%, #e2e8f0 0)`,
                      }}
                    >
                      {match.score}
                    </div>
                  </div>
                  <p className="m-0 text-sm leading-relaxed text-slate-500">{match.summary}</p>
                  <Link className="btn btn-secondary btn-sm mt-auto" href={`/careers/${match.id}`}>
                    Xem chi tiết
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[
          { href: "/assessment", icon: ClipboardList, title: assessmentReady ? "Làm lại bài đánh giá" : "Làm bài đánh giá", desc: "Cập nhật hồ sơ dùng thử trong tab này." },
          { href: "/advisor", icon: Bot, title: "Chat với AI Career Coach", desc: "Hỏi về lộ trình, so sánh nghề hoặc hoạt động trải nghiệm." },
          { href: "/explore", icon: Compass, title: "Xem thư viện nghề", desc: "Khám phá nghề, ngành học và kỹ năng liên quan." },
        ].map((action) => {
          const Icon = action.icon;
          return (
            <Link className="card card-hover group flex flex-col gap-3 p-5 text-inherit" href={action.href} key={action.href}>
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-400 text-white shadow-lg transition-transform group-hover:scale-105">
                <Icon size={22} aria-hidden />
              </span>
              <div>
                <h3 className="m-0 flex items-center gap-1.5 font-display font-bold leading-tight tracking-tight text-slate-900">
                  {action.title}
                  <ArrowRight size={15} aria-hidden className="opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                </h3>
                <p className="m-0 mt-1 text-sm leading-relaxed text-slate-500">{action.desc}</p>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
