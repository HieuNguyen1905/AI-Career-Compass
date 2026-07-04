import { ArrowRight, BarChart3, Bot, ClipboardList, Compass } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { GuestDashboard } from "@/components/guest-dashboard";
import { hasCompletedCurrentAssessment } from "@/lib/assessment-status";
import { getCurrentUser, makeGuestUser } from "@/lib/auth";
import { getMyProfile, listCareerMatches } from "@/lib/data";
import { Role, type CareerProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

function completeness(profile: CareerProfile | null, assessmentReady: boolean) {
  if (!profile) return 0;
  const checks = [
    assessmentReady,
    profile.interests.length > 0,
    profile.strengths.length > 0,
    profile.favoriteSubjects.length > 0,
    profile.values.length > 0,
    profile.riasec.length > 0
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export default async function DashboardPage() {
  const currentUser = await getCurrentUser();
  const user = currentUser ?? makeGuestUser();

  if (user.role === Role.ADMIN) {
    redirect("/admin");
  }

  if (!currentUser) {
    return (
      <AppShell
        user={user}
        active="/dashboard"
        title="Dùng thử AI Career Compass"
        description="Trạng thái đang được lưu tạm, đăng nhập để được lưu lâu dài."
      >
        <GuestDashboard />
      </AppShell>
    );
  }

  const profile = await getMyProfile();

  const assessmentReady = hasCompletedCurrentAssessment(profile);
  const careerMatches = assessmentReady ? await listCareerMatches(false, 3) : [];
  const matches = careerMatches.slice(0, 3);
  const canShowMatches = assessmentReady && matches.length > 0;
  const profileCompleteness = completeness(profile, assessmentReady);

  const stats = [
    {
      label: "Bài đánh giá",
      value: assessmentReady ? "Đã xong" : "Bắt đầu",
      icon: ClipboardList,
      tone: "from-teal-500 to-emerald-400"
    },
    {
      label: "Mức hoàn thiện hồ sơ",
      value: `${profileCompleteness}%`,
      icon: BarChart3,
      tone: "from-sky-500 to-cyan-400"
    }
  ];

  const quickActions = [
    {
      href: "/assessment",
      icon: ClipboardList,
      tone: "from-teal-500 to-emerald-400",
      title: assessmentReady ? "Làm lại bài đánh giá" : "Làm bài đánh giá",
      desc: "Cập nhật hồ sơ năng lực khi sở thích hoặc mục tiêu thay đổi."
    },
    {
      href: "/advisor",
      icon: Bot,
      tone: "from-amber-500 to-orange-400",
      title: "Chat với AI Career Coach",
      desc: "Hỏi về lộ trình, so sánh nghề hoặc cách trao đổi với gia đình."
    },
    {
      href: "/explore",
      icon: Compass,
      tone: "from-sky-500 to-cyan-400",
      title: "Xem thư viện nghề",
      desc: "Mở chi tiết nghề, môn học, ngành học liên quan và hoạt động thử."
    }
  ];

  return (
    <AppShell
      user={user}
      active="/dashboard"
      title={`Xin chào, ${user.name}`}
      description="Tổng quan tiến độ đánh giá, top nghề phù hợp và các hành động tiếp theo."
    >
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card card-hover flex items-start justify-between gap-3 p-5">
              <div>
                <span className="block text-[13px] font-medium text-slate-500">{stat.label}</span>
                <strong className="mt-2 block font-display text-2xl font-extrabold leading-none tracking-tight text-slate-900">
                  {stat.value}
                </strong>
              </div>
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${stat.tone} text-white shadow-lg`}>
                <Icon size={22} aria-hidden />
              </span>
            </div>
          );
        })}
      </section>

      {!assessmentReady ? (
        <section className="relative my-6 overflow-hidden rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 to-white p-6 shadow-sm">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-200/40 blur-2xl" />
          <div className="relative flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="m-0 font-display text-xl font-bold leading-tight tracking-tight text-slate-900">
                Bạn chưa hoàn thành đánh giá
              </h2>
              <p className="m-0 mt-2 max-w-2xl leading-relaxed text-slate-600">
                Hãy trả lời 32 câu hỏi về môn học, sở thích, kỹ năng và giá trị nghề nghiệp 
                để hệ thống tạo tóm tắt hồ sơ và top gợi ý nghề nghiệp.
              </p>
            </div>
            <Link className="btn btn-primary shrink-0" href="/assessment">
              Làm bài đánh giá
              <ArrowRight size={18} aria-hidden />
            </Link>
          </div>
        </section>
      ) : null}

      {canShowMatches ? (
        <>
          <div className="mb-3.5 mt-7 flex items-center justify-between gap-3">
            <h2 className="m-0 font-display text-xl font-bold leading-tight tracking-tight text-slate-900">Top hướng nghề gần nhất</h2>
            <Link className="btn btn-secondary btn-sm" href="/explore">
              Xem tất cả
              <ArrowRight size={16} aria-hidden />
            </Link>
          </div>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
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
                      background: `radial-gradient(circle at center, #fff 58%, transparent 60%), conic-gradient(#0d9488 ${match.score}%, #e2e8f0 0)`
                    }}
                  >
                    {match.score}
                  </div>
                </div>
                <p className="m-0 text-sm leading-relaxed text-slate-500">{match.summary}</p>
                <ul className="m-0 grid list-disc gap-1 pl-5 text-sm leading-relaxed text-slate-700">
                  {match.reasons.slice(0, 3).map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                <Link className="btn btn-secondary btn-sm mt-auto" href={`/careers/${match.id}`}>
                  Xem chi tiết
                </Link>
              </article>
            ))}
          </section>
        </>
      ) : null}

      <div className="mb-3.5 mt-8 flex items-center justify-between gap-3">
        <h2 className="m-0 font-display text-xl font-bold leading-tight tracking-tight text-slate-900">Hành động nhanh</h2>
      </div>
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link className="card card-hover group flex flex-col gap-3 p-5 text-inherit" href={action.href} key={action.href}>
              <span className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${action.tone} text-white shadow-lg transition-transform group-hover:scale-105`}>
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

      <section className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white/50 p-6 text-center text-sm leading-relaxed text-slate-500">
        Gợi ý của AI Career Compass chỉ là tham khảo. Không có một lựa chọn duy nhất. Hãy trải nghiệm thực tế, ghi lại và trao đổi với thầy cô, gia đình để tìm ra con đường phù hợp với bạn.
      </section>
    </AppShell>
  );
}
