import { ArrowLeft, Bot } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { GuestCareerReasons, GuestCareerScore } from "@/components/guest-career-detail";
import { hasCompletedCurrentAssessment } from "@/lib/assessment-status";
import { getCurrentUser, makeGuestUser } from "@/lib/auth";
import { getCareerById, getMyProfile, listCareerMatches } from "@/lib/data";

export const dynamic = "force-dynamic";

function ChipSection({
  title,
  items,
  tone = "slate"
}: {
  title: string;
  items: string[];
  tone?: "teal" | "slate" | "amber";
}) {
  if (items.length === 0) return null;
  const chipClass = tone === "teal" ? "chip-teal" : tone === "amber" ? "chip-amber" : "chip-slate";

  return (
    <article className="card card-hover p-5 sm:p-6">
      <h2 className="m-0 font-display text-[17px] font-bold leading-tight tracking-tight text-slate-900">{title}</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <span className={`${chipClass} max-w-full truncate`} key={item} title={item}>{item}</span>
        ))}
      </div>
    </article>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;

  return (
    <article className="card p-6">
      <h2 className="m-0 font-display text-[17px] font-bold leading-tight tracking-tight text-slate-900">{title}</h2>
      <ul className="m-0 mt-3 grid list-disc gap-1.5 pl-5 text-sm leading-relaxed text-slate-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}

export default async function CareerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  const user = currentUser ?? makeGuestUser();
  const { id } = await params;
  const career = await getCareerById(id);

  if (!career) notFound();

  const profile = currentUser ? await getMyProfile() : null;
  const assessmentReady = hasCompletedCurrentAssessment(profile);
  const matches = currentUser && assessmentReady ? await listCareerMatches() : [];
  const match = matches.find((item) => item.id === career.id);
  const score = match?.score;

  return (
    <AppShell
      user={user}
      active="/explore"
      title={career.title}
      description="Chi tiết nghề, ngành học liên quan và hoạt động khám phá phù hợp."
    >
      <section className="card relative mb-6 overflow-hidden p-6 sm:p-8">
        <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <span className="chip-amber mb-3 inline-flex max-w-full truncate">{career.cluster || "Chưa phân nhóm"}</span>
            <h2 className="m-0 mb-3 font-display text-xl sm:text-2xl font-bold leading-tight tracking-tight text-slate-900 break-words">Nghề này làm gì?</h2>
            <p className="m-0 max-w-2xl leading-relaxed text-slate-500">{career.summary || "Chưa có mô tả tóm tắt."}</p>
          </div>
          {!currentUser ? (
            <GuestCareerScore careerId={career.id} />
          ) : score != null ? (
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className="ring-score h-[92px] w-[92px] text-2xl"
                style={{ background: `radial-gradient(circle at center, #fff 60%, transparent 62%), conic-gradient(#7c3aed ${score}%, #ede9fe 0)` }}
              >
                {score}
              </div>
              <span className="text-xs font-bold uppercase tracking-wide text-slate-400">điểm phù hợp</span>
            </div>
          ) : !assessmentReady ? (
            <div className="max-w-[220px] rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-relaxed text-amber-800">
              Hoàn thành bài đánh giá để xem điểm phù hợp cá nhân.
            </div>
          ) : null}
        </div>
      </section>

      <section className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChipSection title="Môn học liên quan" items={career.subjects} tone="teal" />
        <ChipSection title="Kỹ năng nghề nghiệp" items={career.jobSkills} />
        <ChipSection title="Ngành học phù hợp" items={career.majors} tone="amber" />
      </section>

      <section className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ListSection title="Nhiệm vụ công việc" items={career.jobTasks} />
        <ListSection title="Hoạt động trải nghiệm" items={career.activities} />
      </section>

      {!currentUser ? <GuestCareerReasons careerId={career.id} /> : null}

      {currentUser && match && match.reasons.length > 0 ? (
        <section className="card mb-4 p-6">
          <h2 className="m-0 font-display text-[17px] font-bold leading-tight tracking-tight text-slate-900">Lý do hệ thống gợi ý</h2>
          <ul className="m-0 mt-3 grid list-disc gap-1.5 pl-5 text-sm leading-relaxed text-slate-700">
            {match.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mb-8 mt-6 rounded-2xl border border-dashed border-slate-300 bg-white/50 p-6 text-center text-sm leading-relaxed text-slate-500">
        Đây là gợi ý tham khảo để khám phá, không phải kết luận cuối cùng về năng lực hay tương lai của học sinh.
      </section>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link className="btn btn-primary w-full sm:w-auto justify-center" href="/advisor">
          <Bot size={18} aria-hidden />
          Chat với AI về nghề này
        </Link>
        <Link className="btn btn-secondary w-full sm:w-auto justify-center" href="/explore">
          <ArrowLeft size={18} aria-hidden />
          Quay lại gợi ý nghề
        </Link>
      </div>
    </AppShell>
  );
}
