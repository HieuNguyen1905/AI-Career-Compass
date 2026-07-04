import { ArrowRight, BookOpen, BrainCircuit, GraduationCap, Sparkles, Target } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { CareerLibrary } from "@/components/career-library";
import { GuestExplore } from "@/components/guest-explore";
import { hasCompletedCurrentAssessment } from "@/lib/assessment-status";
import { getCurrentUser, makeGuestUser } from "@/lib/auth";
import { getMyProfile, listCareerMatches, listCareers } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const currentUser = await getCurrentUser();
  const user = currentUser ?? makeGuestUser();

  if (!currentUser) {
    const careers = await listCareers();
    return (
      <AppShell
        user={user}
        active="/explore"
        description="Top 3-5 hướng nghề phù hợp."
        title="Kết quả gợi ý nghề nghiệp"
      >
        <GuestExplore careers={careers} />
      </AppShell>
    );
  }

  const profile = await getMyProfile();
  const assessmentReady = hasCompletedCurrentAssessment(profile);
  const matches = assessmentReady ? await listCareerMatches() : [];
  const topMatches = matches.slice(0, 5);
  const canShowMatches = assessmentReady && topMatches.length > 0;

  const allCareers = assessmentReady ? await listCareers() : [];
  const matchMap = new Map(matches.map(m => [m.id, m]));
  const libraryCareers = [
    ...matches.slice(5),
    ...allCareers.filter(c => !matchMap.has(c.id))
  ];

  return (
    <AppShell
      user={user}
      active="/explore"
      title="Kết quả gợi ý nghề nghiệp"
      description="Top 3-5 hướng nghề phù hợp."
    >
      {!canShowMatches ? (
        <section className="relative my-6 overflow-hidden rounded-2xl border border-amber-200/60 bg-gradient-to-r from-amber-50 via-white to-amber-50/30 p-6 shadow-sm sm:p-8">
          <div className="absolute -right-10 -top-10 h-40 w-40 animate-pulse rounded-full bg-amber-200/50 blur-2xl" />
          <div className="relative flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <Target size={24} />
              </div>
              <div>
                <h2 className="m-0 font-display text-xl font-bold leading-tight tracking-tight text-slate-900">
                  Cần hoàn thành đánh giá
                </h2>
                <p className="m-0 mt-1.5 max-w-xl text-[15px] leading-relaxed text-slate-600">
                  Hệ thống chỉ hiển thị gợi ý nghề nghiệp sau khi bạn trả lời đủ bài đánh giá. Hãy hoàn thành bài đánh giá để nhận top gợi ý.
                </p>
              </div>
            </div>
            <Link className="btn btn-primary shrink-0 group shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 transition-all" href="/assessment">
              Làm đánh giá ngay
              <ArrowRight size={16} className="ml-1 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </section>
      ) : null}

      {canShowMatches ? (
        <>
      <section className="relative mb-10 overflow-hidden rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-6 shadow-sm sm:p-10">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-teal-200/30 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-200/20 blur-3xl" />

        <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal-800">
              <Sparkles size={14} />
              5 định hướng nổi bật
            </span>
            <h2 className="m-0 mb-3 font-display text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight text-slate-900">
              Không có giới hạn nào cho bạn
            </h2>
            <p className="m-0 max-w-2xl text-[16px] leading-relaxed text-slate-600">
              Mỗi gợi ý dưới đây đi kèm với độ phù hợp, lý do chi tiết và các kỹ năng liên quan. Hãy khám phá từng
              lĩnh vực và tìm ra đam mê thực sự của bạn.
            </p>
          </div>
          <Link className="btn btn-secondary shrink-0 group relative overflow-hidden border-slate-200 bg-white shadow-sm transition-all hover:bg-slate-50 w-full sm:w-auto justify-center" href="/advisor">
            <BrainCircuit size={18} className="mr-2 text-teal-600 shrink-0" />
            <span className="font-medium text-slate-700">Trò chuyện với AI</span>
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {topMatches.map((career, index) => (
          <article
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-teal-200 hover:shadow-xl hover:shadow-teal-900/5"
            key={career.id}
          >
            {index === 0 ? (
              <div className="absolute right-0 top-0 z-10 rounded-bl-xl bg-gradient-to-r from-amber-400 to-amber-500 px-3 py-1 text-[11px] font-bold text-white shadow-sm">
                Phù hợp nhất
              </div>
            ) : null}

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 pr-2">
                <span className="mb-2 inline-flex max-w-full items-center truncate rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  {career.cluster}
                </span>
                <h2 className="m-0 font-display text-[18px] font-bold leading-tight tracking-tight text-slate-900 transition-colors group-hover:text-teal-700 break-words">
                  {career.title}
                </h2>
              </div>
              <div
                className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-50 shadow-inner"
                style={{
                  background: `radial-gradient(circle at center, white 55%, transparent 56%), conic-gradient(#0d9488 ${career.score}%, #f1f5f9 0)`
                }}
              >
                <span className="font-display text-base font-bold text-teal-700">{career.score}%</span>
              </div>
            </div>

            <p className="mb-5 mt-3 text-[14px] leading-relaxed text-slate-600 line-clamp-2">{career.summary}</p>

            <div className="mt-auto grid gap-4">
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-[14px] font-bold text-slate-800">
                  <Sparkles size={14} className="text-amber-500" />
                  Lý do phù hợp
                </h3>
                <ul className="m-0 grid gap-1.5">
                  {career.reasons.slice(0, 2).map((reason) => (
                    <li className="flex items-start gap-2 text-[13px] text-slate-600" key={reason}>
                      <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
                      <span className="leading-snug line-clamp-1">{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-[14px] font-bold text-slate-800">
                  <BookOpen size={14} className="text-blue-500" />
                  Môn học tiêu biểu
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {career.subjects.slice(0, 3).map((subject) => (
                    <span className="inline-flex rounded-md border border-teal-100/50 bg-teal-50/80 px-2 py-1 text-[12px] font-medium text-teal-700" key={subject}>
                      {subject}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-[14px] font-bold text-slate-800">
                  <GraduationCap size={14} className="text-indigo-500" />
                  Ngành học liên quan
                </h3>
                <ul className="m-0 grid gap-1.5">
                  {career.majors.slice(0, 2).map((major) => (
                    <li className="flex items-start gap-2 text-[13px] text-slate-600" key={major}>
                      <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                      <span className="leading-snug line-clamp-1">{major}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-slate-100 pt-4">
                <Link className="btn btn-primary w-full justify-center shadow-sm transition-shadow hover:shadow-md group/btn py-2 text-[13px]" href={`/careers/${career.id}`}>
                  <span>Khám phá ngay</span>
                  <ArrowRight size={14} className="ml-1.5 shrink-0 transition-transform group-hover/btn:translate-x-1" />
                </Link>
                <Link className="btn btn-secondary w-full justify-center border-slate-200 bg-white transition-colors hover:bg-slate-50 hover:text-teal-700 py-2 text-[13px]" href="/advisor">
                  <BrainCircuit size={14} className="mr-1.5 shrink-0" />
                  <span>Hỏi AI</span>
                </Link>
              </div>
            </div>
          </article>
        ))}
      </section>

      <div className="mb-8 mt-16">
        <h2 className="m-0 font-display text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-slate-900">
          Thư viện nghề nghiệp
        </h2>
        <p className="mt-2 text-[16px] text-slate-600 max-w-2xl">
          Mở rộng tầm nhìn với hàng trăm nghề nghiệp khác nhau. Tìm kiếm, lọc theo lĩnh vực và khám phá những cơ hội tiềm năng phù hợp với bạn.
        </p>
      </div>

      <CareerLibrary careers={libraryCareers} />
        </>
      ) : null}
    </AppShell>
  );
}
