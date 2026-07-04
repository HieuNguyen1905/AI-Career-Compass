import { ClipboardList } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";
import { assessmentQuestions } from "@/lib/assessment-questions";
import { Role } from "@/lib/types";

export const dynamic = "force-dynamic";

const steps = [
  { key: "subjects", label: "Môn học" },
  { key: "interests", label: "Sở thích" },
  { key: "skills", label: "Kỹ năng" },
  { key: "values", label: "Giá trị nghề nghiệp" }
] as const;

function joinList(values?: string[]) {
  return values && values.length > 0 ? values.join(", ") : "-";
}

export default async function AdminQuestionsPage() {
  const user = await requireRole([Role.ADMIN]);
  const questionsByStep = Object.fromEntries(
    steps.map((step) => [step.key, assessmentQuestions.filter((question) => question.step === step.key)])
  ) as Record<(typeof steps)[number]["key"], typeof assessmentQuestions>;

  return (
    <AppShell
      user={user}
      active="/admin/questions"
      title="Quản trị câu hỏi"
      description="Theo dõi nội dung câu hỏi, nhóm đánh giá và các tag dùng cho hồ sơ năng lực."
    >
      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="card p-6">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700">
              <ClipboardList size={22} aria-hidden />
            </span>
            <div>
              <h2 className="m-0 font-display text-xl font-bold text-slate-900">Ngân hàng câu hỏi</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Kiểm tra nhanh câu hỏi assessment, nhóm nội dung và các tag ảnh hưởng đến kết quả phân tích hồ sơ.
              </p>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <span className="block text-[13px] font-medium text-slate-500">Tổng câu hỏi</span>
          <strong className="mt-2 block font-display text-3xl font-extrabold text-slate-900">{assessmentQuestions.length}</strong>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        {steps.map((step) => (
          <div className="card p-5" key={step.key}>
            <span className="block text-[13px] font-medium text-slate-500">{step.label}</span>
            <strong className="mt-2 block font-display text-2xl font-extrabold text-slate-900">{questionsByStep[step.key].length}</strong>
          </div>
        ))}
      </section>

      <section className="grid gap-6">
        {steps.map((step) => (
          <div className="card overflow-hidden" key={step.key}>
            <div className="border-b border-slate-100 bg-slate-50/80 p-5">
              <h2 className="m-0 font-display text-xl font-bold text-slate-900">{step.label}</h2>
              <p className="mt-1 text-sm text-slate-500">{questionsByStep[step.key].length} câu hỏi</p>
            </div>
            <div className="divide-y divide-slate-100">
              {questionsByStep[step.key].map((question, index) => (
                <article className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_420px]" key={question.id}>
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="chip-slate">Câu {index + 1}</span>
                      <code className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">{question.id}</code>
                    </div>
                    <p className="m-0 text-[15px] font-semibold leading-7 text-slate-800">{question.prompt}</p>
                  </div>
                  <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                    <QuestionMeta label="Môn học" value={joinList(question.weights.favoriteSubjects)} />
                    <QuestionMeta label="Sở thích" value={joinList(question.weights.interests)} />
                    <QuestionMeta label="Kỹ năng" value={joinList(question.weights.strengths)} />
                    <QuestionMeta label="Giá trị" value={joinList(question.weights.values)} />
                    <QuestionMeta label="RIASEC" value={joinList(question.weights.riasec)} wide />
                  </dl>
                </article>
              ))}
            </div>
          </div>
        ))}
      </section>
    </AppShell>
  );
}

function QuestionMeta({
  label,
  value,
  wide = false
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 ${wide ? "sm:col-span-2" : ""}`}>
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-700">{value}</dd>
    </div>
  );
}
