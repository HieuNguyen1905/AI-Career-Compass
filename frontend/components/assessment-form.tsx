"use client";

import { FormEvent, useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  ListChecks,
  Mail,
  Target,
  UserRound,
  VenusAndMars,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import { submitAssessmentAction } from "@/app/actions/assessment";
import { CareerAnalysisLoading } from "@/components/career-analysis-loading";
import {
  GUEST_USER_NAME,
  hydrateGuestMatch,
  hydrateGuestProfile,
  loadGuestAssessmentDraft,
  saveGuestAssessmentDraft,
  saveGuestMatches,
  saveGuestProfile,
} from "@/lib/guest-session";
import type { CareerMatch, CareerProfile } from "@/lib/types";

type AssessmentQuestion = {
  id: string;
  step: "subjects" | "interests" | "skills" | "values";
  prompt: string;
};

type AssessmentFormProps = {
  user: {
    email: string;
    name: string;
    gradeLevel?: string;
    gender?: string;
  };
  profile: {
    gradeLevel?: string;
    goals?: string;
    constraints?: string;
    assessmentAnswers?: Record<string, number>;
  } | null;
  questions: AssessmentQuestion[];
  isGuest?: boolean;
};

type MissingFieldId = "name" | "gender" | "goals" | "constraints";

type MissingField = {
  id: MissingFieldId;
  label: string;
  targetId: string;
};

type MissingQuestion = {
  id: string;
  number: number;
  section: string;
  targetId: string;
};

const steps = [
  { key: "subjects", label: "Môn học" },
  { key: "interests", label: "Sở thích" },
  { key: "skills", label: "Kỹ năng" },
  { key: "values", label: "Ưu tiên nghề nghiệp" }
] as const;

const scores = [1, 2, 3, 4, 5] as const;
const missingToastId = "assessment-missing-fields";

function MissingAssessmentToast({
  visible,
  missingFields,
  missingQuestions,
  onClose,
  onJump,
}: {
  visible: boolean;
  missingFields: MissingField[];
  missingQuestions: MissingQuestion[];
  onClose: () => void;
  onJump: (targetId: string) => void;
}) {
  const hasFields = missingFields.length > 0;
  const hasQuestions = missingQuestions.length > 0;
  const firstTargetId = missingFields[0]?.targetId ?? missingQuestions[0]?.targetId;

  return (
    <div
      className={`pointer-events-auto w-[min(92vw,460px)] overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-[0_24px_60px_-22px_rgba(15,23,42,0.45)] ring-1 ring-rose-100 transition-all duration-200 ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
      }`}
      role="alert"
    >
      <div className="flex items-start gap-3 border-b border-rose-100 bg-rose-50/90 p-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-rose-600 shadow-sm">
          <AlertTriangle size={20} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="m-0 font-display text-[15px] font-extrabold text-slate-950">Assessment chưa hoàn tất</p>
          <p className="mt-1 text-sm font-medium leading-5 text-rose-800">
            {hasFields && hasQuestions
              ? `Còn ${missingFields.length} thông tin và ${missingQuestions.length} câu hỏi cần bổ sung.`
              : hasFields
                ? `Còn ${missingFields.length} thông tin cần bổ sung.`
                : `Còn ${missingQuestions.length} câu hỏi chưa trả lời.`}
          </p>
        </div>
        <button
          aria-label="Đóng thông báo"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
          onClick={onClose}
          type="button"
        >
          <X size={17} aria-hidden />
        </button>
      </div>

      <div className="grid gap-3 p-4">
        {hasFields ? (
          <div>
            <p className="m-0 text-xs font-extrabold text-slate-500">Thông tin còn thiếu</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {missingFields.map((field) => (
                <button
                  className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition-colors hover:border-rose-300 hover:bg-rose-100"
                  key={field.id}
                  onClick={() => onJump(field.targetId)}
                  type="button"
                >
                  {field.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {hasQuestions ? (
          <div>
            <p className="m-0 text-xs font-extrabold text-slate-500">Câu hỏi chưa trả lời</p>
            <div className="mt-2 max-h-32 overflow-y-auto pr-1">
              <div className="flex flex-wrap gap-2">
                {missingQuestions.map((question) => (
                  <button
                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 transition-colors hover:border-amber-300 hover:bg-amber-100"
                    key={question.id}
                    onClick={() => onJump(question.targetId)}
                    title={question.section}
                    type="button"
                  >
                    Câu {question.number}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {firstTargetId ? (
          <button className="btn btn-primary btn-sm mt-1 w-full" onClick={() => onJump(firstTargetId)} type="button">
            Đi tới mục đầu tiên
            <ArrowRight size={16} aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function AssessmentSubmitButton({ pendingOverride }: { pendingOverride?: boolean }) {
  const { pending } = useFormStatus();
  const isPending = pendingOverride ?? pending;

  return (
    <>
      {isPending ? <CareerAnalysisLoading /> : null}
      <button
        aria-disabled={isPending}
        className="btn btn-primary w-full sm:w-auto shrink-0 disabled:cursor-wait disabled:opacity-70 !px-4 !py-2 text-sm sm:!px-5 sm:!py-2.5 sm:text-[15px]"
        disabled={isPending}
        type="submit"
      >
        <CheckCircle2 size={18} aria-hidden className="shrink-0" />
        <span>{isPending ? "Đang phân tích..." : "Lưu assessment"}</span>
      </button>
    </>
  );
}

export function AssessmentForm({ user, profile, questions, isGuest = false }: AssessmentFormProps) {
  const router = useRouter();
  const [submitState, submitFormAction] = useActionState(submitAssessmentAction, { error: null });
  const [answers, setAnswers] = useState<Record<string, number>>(profile?.assessmentAnswers ?? {});
  const [name, setName] = useState(user.name.trim().length >= 2 ? user.name : GUEST_USER_NAME);
  const [gradeLevel, setGradeLevel] = useState(profile?.gradeLevel ?? user.gradeLevel ?? "11");
  const [gender, setGender] = useState(user.gender ?? "");
  const [goals, setGoals] = useState(profile?.goals ?? "");
  const [constraints, setConstraints] = useState(profile?.constraints ?? "");
  const [guestReady, setGuestReady] = useState(!isGuest);
  const [guestPending, setGuestPending] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);
  const [missingFieldIds, setMissingFieldIds] = useState<MissingFieldId[]>([]);
  const [missingQuestionIds, setMissingQuestionIds] = useState<string[]>([]);
  const totalQuestions = questions.length;
  const answeredCount = questions.filter((question) => answers[question.id]).length;
  const submitError = isGuest ? guestError : submitState.error;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const questionsByStep = useMemo(
    () =>
      Object.fromEntries(
        steps.map((step) => [step.key, questions.filter((question) => question.step === step.key)])
      ) as Record<(typeof steps)[number]["key"], AssessmentQuestion[]>,
    [questions]
  );
  const questionDetails = useMemo(
    () =>
      Object.fromEntries(
        questions.map((question, index) => {
          const step = steps.find((item) => item.key === question.step);
          return [question.id, { number: index + 1, section: step?.label ?? "" }];
        })
      ) as Record<string, { number: number; section: string }>,
    [questions]
  );
  const missingFieldIdSet = useMemo(() => new Set(missingFieldIds), [missingFieldIds]);
  const missingQuestionIdSet = useMemo(() => new Set(missingQuestionIds), [missingQuestionIds]);

  function toggleAnswer(questionId: string, score: number) {
    setAnswers((current) => {
      if (current[questionId] === score) {
        const next = { ...current };
        delete next[questionId];
        return next;
      }

      return { ...current, [questionId]: score };
    });
    setMissingQuestionIds((current) => current.filter((id) => id !== questionId));
  }

  useEffect(() => {
    if (!isGuest) return;

    const draft = loadGuestAssessmentDraft();
    if (draft) {
      setName(draft.name || GUEST_USER_NAME);
      setGender(draft.gender || "");
      setGradeLevel(draft.gradeLevel || "11");
      setGoals(draft.goals || "");
      setConstraints(draft.constraints || "");
      setAnswers(draft.answers || {});
    }
    setGuestReady(true);
  }, [isGuest]);

  useEffect(() => {
    if (!isGuest || !guestReady) return;

    saveGuestAssessmentDraft({
      name,
      gender,
      gradeLevel,
      goals,
      constraints,
      answers,
    });
  }, [answers, constraints, gender, goals, gradeLevel, guestReady, isGuest, name]);

  function clearMissingField(fieldId: MissingFieldId, shouldClear: boolean) {
    if (!shouldClear) return;
    setMissingFieldIds((current) => current.filter((id) => id !== fieldId));
  }

  function scrollToTarget(targetId: string) {
    window.requestAnimationFrame(() => {
      const target = document.getElementById(targetId);
      if (!target) return;

      target.scrollIntoView({ behavior: "smooth", block: "center" });

      if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) {
        target.focus({ preventScroll: true });
        return;
      }

      const focusable = target.querySelector<HTMLElement>("button, input, select, textarea, [tabindex]");
      focusable?.focus({ preventScroll: true });
    });
  }

  function getAssessmentGaps() {
    const missingFields: MissingField[] = [];

    if (name.trim().length < 2) {
      missingFields.push({ id: "name", label: "Họ tên", targetId: "name" });
    }
    if (!gender.trim()) {
      missingFields.push({ id: "gender", label: "Giới tính", targetId: "gender" });
    }
    if (goals.trim().length < 5) {
      missingFields.push({ id: "goals", label: "Mục tiêu cá nhân", targetId: "goals" });
    }
    if (!constraints.trim()) {
      missingFields.push({ id: "constraints", label: "Bối cảnh cá nhân", targetId: "constraints" });
    }

    const missingQuestions = questions
      .filter((question) => !answers[question.id])
      .map((question) => ({
        id: question.id,
        number: questionDetails[question.id]?.number ?? 0,
        section: questionDetails[question.id]?.section ?? "",
        targetId: `assessment-question-${question.id}`,
      }));

    return { missingFields, missingQuestions };
  }

  function showMissingAssessmentToast(missingFields: MissingField[], missingQuestions: MissingQuestion[]) {
    const firstTargetId = missingFields[0]?.targetId ?? missingQuestions[0]?.targetId;

    toast.custom(
      (toastInstance) => (
        <MissingAssessmentToast
          visible={toastInstance.visible}
          missingFields={missingFields}
          missingQuestions={missingQuestions}
          onClose={() => toast.dismiss(toastInstance.id)}
          onJump={(targetId) => scrollToTarget(targetId)}
        />
      ),
      { duration: 10000, id: missingToastId }
    );

    if (firstTargetId) {
      scrollToTarget(firstTargetId);
    }
  }

  async function handleAssessmentSubmit(event: FormEvent<HTMLFormElement>) {
    if (guestPending) {
      event.preventDefault();
      return;
    }

    const { missingFields, missingQuestions } = getAssessmentGaps();
    const hasMissingItems = missingFields.length > 0 || missingQuestions.length > 0;

    if (hasMissingItems) {
      event.preventDefault();
      setMissingFieldIds(missingFields.map((field) => field.id));
      setMissingQuestionIds(missingQuestions.map((question) => question.id));
      setGuestError(null);
      showMissingAssessmentToast(missingFields, missingQuestions);
      return;
    }

    setMissingFieldIds([]);
    setMissingQuestionIds([]);
    toast.dismiss(missingToastId);

    if (!isGuest) return;

    event.preventDefault();

    setGuestPending(true);
    setGuestError(null);

    try {
      const response = await fetch("/api/guest/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          gender,
          gradeLevel,
          goals,
          constraints,
          answers,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { matches?: unknown; profile?: unknown; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Không thể xử lý assessment dùng thử.");
      }

      const profile = hydrateGuestProfile(data.profile) as CareerProfile | null;
      if (!profile) {
        throw new Error("Kết quả assessment không hợp lệ.");
      }

      const matches = Array.isArray(data.matches)
        ? data.matches.map(hydrateGuestMatch).filter((match): match is CareerMatch => Boolean(match))
        : [];
      if (matches.length < 5) {
        throw new Error("AI chưa tạo đủ giải thích nghề nghiệp cho Top 5. Vui lòng thử lại sau ít phút.");
      }

      saveGuestProfile(profile);
      saveGuestMatches(matches);
      router.push("/profile");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Có lỗi khi xử lý assessment.";
      setGuestError(message);
      toast.error(message, { id: "assessment-submit-error" });
    } finally {
      setGuestPending(false);
    }
  }

  return (
    <form className="grid gap-5" action={isGuest ? undefined : submitFormAction} noValidate onSubmit={handleAssessmentSubmit}>
      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 bg-white/70 p-5 lg:p-6">
          <span className="text-xs font-black uppercase tracking-wide text-teal-700">Thông tin cá nhân</span>
          <h2 className="mt-1 font-display text-[20px] font-extrabold leading-tight text-slate-950">Cập nhật hồ sơ cơ bản</h2>
        </div>
        <div className="grid gap-5 p-5 lg:grid-cols-[120px_minmax(0,1fr)] lg:p-6">
          <div className="flex justify-center lg:justify-start">
            <div className="grid h-24 w-24 place-items-center rounded-full border border-slate-200 bg-slate-100 text-slate-400">
              <UserRound size={40} aria-hidden />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="name" className="field-label">Họ tên</label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} aria-hidden />
                <input
                  aria-invalid={missingFieldIdSet.has("name")}
                  className={`field pl-10 ${missingFieldIdSet.has("name") ? "border-rose-400 bg-rose-50/80 ring-4 ring-rose-500/10" : ""}`}
                  id="name"
                  name="name"
                  value={name}
                  onChange={(event) => {
                    const value = event.target.value;
                    setName(value);
                    clearMissingField("name", value.trim().length >= 2);
                  }}
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <label htmlFor="email" className="field-label">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} aria-hidden />
                <input className="field cursor-not-allowed bg-slate-50 pl-10 text-slate-500" id="email" name="email" defaultValue={user.email} readOnly />
              </div>
            </div>
            <div className="grid gap-2">
              <label htmlFor="gradeLevel" className="field-label">Lớp</label>
              <div className="relative">
                <GraduationCap className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} aria-hidden />
                <select className="field pl-10" id="gradeLevel" name="gradeLevel" value={gradeLevel} onChange={(event) => setGradeLevel(event.target.value)}>
                  <option value="10">Lớp 10</option>
                  <option value="11">Lớp 11</option>
                  <option value="12">Lớp 12</option>
                </select>
              </div>
            </div>
            <div className="grid gap-2">
              <label htmlFor="gender" className="field-label">Giới tính</label>
              <div className="relative">
                <VenusAndMars className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} aria-hidden />
                <select
                  aria-invalid={missingFieldIdSet.has("gender")}
                  className={`field pl-10 ${missingFieldIdSet.has("gender") ? "border-rose-400 bg-rose-50/80 ring-4 ring-rose-500/10" : ""}`}
                  id="gender"
                  name="gender"
                  value={gender}
                  onChange={(event) => {
                    const value = event.target.value;
                    setGender(value);
                    clearMissingField("gender", value.trim().length > 0);
                  }}
                  required
                >
                  <option value="">Chọn giới tính</option>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 bg-white/70 p-5 lg:p-6">
          <span className="text-xs font-black uppercase tracking-wide text-teal-700">Bối cảnh cá nhân</span>
          <h2 className="mt-1 font-display text-[20px] font-extrabold leading-tight text-slate-950">Trả lời trước khi đánh giá</h2>
        </div>
        <div className="grid gap-4 p-5 lg:grid-cols-2 lg:p-6">
          <div className="grid gap-2">
            <label htmlFor="goals" className="field-label">Bạn có mục tiêu nào muốn đạt được?</label>
            <div className="relative">
              <Target className="pointer-events-none absolute left-3 top-3 text-slate-400" size={17} aria-hidden />
              <textarea
                aria-invalid={missingFieldIdSet.has("goals")}
                className={`field min-h-[116px] resize-y pl-10 ${missingFieldIdSet.has("goals") ? "border-rose-400 bg-rose-50/80 ring-4 ring-rose-500/10" : ""}`}
                id="goals"
                name="goals"
                value={goals}
                onChange={(event) => {
                  const value = event.target.value;
                  setGoals(value);
                  clearMissingField("goals", value.trim().length >= 5);
                }}
                placeholder="Mục tiêu nghề nghiệp đã có hoặc mong muốn cá nhân."
                minLength={5}
                required
              />
            </div>
          </div>
          <div className="grid gap-2">
            <label htmlFor="constraints" className="field-label">Có bối cảnh cá nhân nào cần hệ thống cân nhắc?</label>
            <textarea
              aria-invalid={missingFieldIdSet.has("constraints")}
              className={`field min-h-[116px] resize-y ${missingFieldIdSet.has("constraints") ? "border-rose-400 bg-rose-50/80 ring-4 ring-rose-500/10" : ""}`}
              id="constraints"
              name="constraints"
              value={constraints}
              onChange={(event) => {
                const value = event.target.value;
                setConstraints(value);
                clearMissingField("constraints", value.trim().length > 0);
              }}
              placeholder="Kỳ vọng của gia đình về nghề nghiệp hoặc các điều kiện cá nhân khác."
              required
            />
          </div>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-6">
          <div>
            <h2 className="m-0 font-display text-[22px] font-extrabold leading-tight text-slate-950">
              Điền hồ sơ năng lực
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Chọn mức phù hợp với bạn ở thời điểm hiện tại. Có thể cập nhật lại sau.
            </p>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4">
                <p className="m-0 text-sm font-extrabold text-slate-900">Thang điểm</p>
                <div className="mt-3 grid gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-xl bg-slate-50 px-2.5 py-1.5 sm:px-3 sm:py-2">
                    <span className="block font-black text-slate-900">1</span>
                    Rất không giống tôi
                  </div>
                  <div className="rounded-xl bg-slate-50 px-2.5 py-1.5 sm:px-3 sm:py-2">
                    <span className="block font-black text-slate-900">2</span>
                    Không giống tôi
                  </div>
                  <div className="rounded-xl bg-slate-50 px-2.5 py-1.5 sm:px-3 sm:py-2">
                    <span className="block font-black text-slate-900">3</span>
                    Bình thường, không có ấn tượng
                  </div>
                  <div className="rounded-xl bg-teal-50 px-2.5 py-1.5 sm:px-3 sm:py-2 text-teal-800">
                    <span className="block font-black">4</span>
                    Khá giống tôi
                  </div>
                  <div className="rounded-xl bg-teal-50 px-2.5 py-1.5 sm:px-3 sm:py-2 text-teal-800">
                    <span className="block font-black">5</span>
                    Hoàn toàn giống tôi
                  </div>
                </div>
              </div>
          </div>

          <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="m-0 text-xs font-bold uppercase tracking-wide text-teal-700">Tiến độ</p>
                <p className="mt-1 text-2xl font-black text-slate-950">
                  {answeredCount}/{totalQuestions}
                </p>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-white text-teal-700 shadow-sm">
                <ListChecks size={21} aria-hidden />
              </div>
            </div>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="mt-3 text-xs font-semibold text-teal-800">{totalQuestions} câu · khoảng 7 phút</p>
          </div>
        </div>
      </section>

      {steps.map((step, stepIndex) => {
        const stepQuestions = questionsByStep[step.key];
        const stepAnsweredCount = stepQuestions.filter((question) => answers[question.id]).length;

        return (
          <section className="card overflow-hidden" key={step.key}>
            <div className="border-b border-slate-100 bg-white/70 p-5 lg:p-6">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)] lg:items-end">
                <div>
                  <span className="text-xs font-black uppercase tracking-wide text-teal-700">Phần {stepIndex + 1}</span>
                  <h2 className="mt-1 font-display text-[20px] font-extrabold leading-tight text-slate-950">{step.label}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {stepAnsweredCount}/{stepQuestions.length} câu đã trả lời
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3" aria-label={`Tiến độ ${step.label}`}>
                  <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-500">
                    <span>Tiến độ phần này</span>
                    <span className="text-teal-700">
                      {stepAnsweredCount}/{stepQuestions.length}
                    </span>
                  </div>
                  <div
                    className="mt-3 grid gap-1.5 overflow-x-auto no-scrollbar pb-1 max-w-full"
                    style={{ gridTemplateColumns: `repeat(${stepQuestions.length}, minmax(12px, 1fr))` }}
                  >
                  {stepQuestions.map((question, index) => {
                    const isAnswered = Boolean(answers[question.id]);
                    const isMissing = missingQuestionIdSet.has(question.id);

                    return (
                      <span
                        className={`h-2.5 min-w-[12px] rounded-full transition-colors shrink-0 ${
                          isAnswered
                            ? "bg-teal-600 shadow-sm shadow-teal-600/20"
                            : isMissing
                              ? "bg-rose-400 shadow-sm shadow-rose-400/20"
                              : "bg-slate-200"
                        }`}
                        key={question.id}
                        title={`Câu ${index + 1}: ${isAnswered ? "đã trả lời" : "chưa trả lời"}`}
                      />
                    );
                  })}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                    <span className="h-2 w-2 rounded-full bg-teal-600" />
                    <span>Đã trả lời</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {stepQuestions.map((question, index) => {
                const currentScore = answers[question.id];
                const isMissing = missingQuestionIdSet.has(question.id);
                const questionNumber = questionDetails[question.id]?.number ?? index + 1;
                const questionLabelId = `question-${question.id}`;

                return (
                  <div
                    className={`grid scroll-mt-28 gap-4 p-4 transition-colors focus:outline-none sm:p-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center lg:gap-6 lg:p-6 ${
                      isMissing ? "bg-rose-50/70 ring-1 ring-inset ring-rose-200" : ""
                    }`}
                    id={`assessment-question-${question.id}`}
                    key={question.id}
                    tabIndex={-1}
                  >
                    <div>
                      <p className="m-0 text-sm sm:text-[15px] font-semibold leading-relaxed text-slate-800" id={questionLabelId}>
                        <span
                          className={`mr-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                            isMissing ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {index + 1}
                        </span>
                        <span>{question.prompt}</span>
                      </p>
                      {isMissing ? (
                        <p className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-extrabold text-rose-700 ring-1 ring-rose-200">
                          Cần trả lời câu {questionNumber}
                        </p>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 sm:gap-2" role="radiogroup" aria-labelledby={questionLabelId}>
                      {currentScore ? <input type="hidden" name={question.id} value={currentScore} /> : null}
                      {scores.map((score) => {
                        const isSelected = currentScore === score;

                        return (
                          <button
                            aria-checked={isSelected}
                            aria-label={`${score}`}
                            className={`flex h-12 min-h-[44px] min-w-[44px] w-full items-center justify-center rounded-xl border text-sm sm:text-base font-black shadow-sm transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/20 ${
                              isSelected
                                ? "border-transparent bg-teal-600 text-white shadow-[0_10px_20px_-10px_rgba(15,118,110,0.8)]"
                                : "border-slate-200 bg-white text-slate-500 hover:border-teal-300 hover:text-teal-700"
                            }`}
                            key={score}
                            onClick={() => toggleAnswer(question.id, score)}
                            role="radio"
                            type="button"
                          >
                            {score}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {submitError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {submitError}
        </div>
      ) : null}

      <div className="sticky bottom-[calc(3.8rem+env(safe-area-inset-bottom))] lg:bottom-0 z-20 -mx-3.5 sm:-mx-7 mt-4 flex items-center justify-between gap-3 sm:gap-4 border-t border-slate-200 bg-white/95 p-3.5 sm:p-4 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.25)] backdrop-blur lg:mx-0 lg:rounded-2xl lg:border">
        <span className="text-xs sm:text-sm font-semibold text-slate-600 min-w-0 truncate">
          {answeredCount}/{totalQuestions} câu đã trả lời
        </span>
        <div className="shrink-0">
          <AssessmentSubmitButton pendingOverride={isGuest ? guestPending : undefined} />
        </div>
      </div>
    </form>
  );
}
