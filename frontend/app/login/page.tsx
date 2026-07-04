import { Compass, ShieldCheck, ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LoginForm } from "@/components/auth-forms";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="grid min-h-[100dvh] grid-cols-1 lg:min-h-screen lg:grid-cols-[minmax(320px,0.9fr)_minmax(380px,1.1fr)]">
      <section className="relative flex min-h-[auto] flex-col justify-between gap-4 overflow-hidden p-6 text-white sm:p-10 lg:min-h-screen lg:gap-0 lg:p-12">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(165deg,#0b1220_0%,#0c1f25_50%,#0a2a26_100%)]" />
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="animate-aurora absolute -top-24 -left-16 h-96 w-96 rounded-full bg-teal-500/25 blur-3xl" />
          <div className="animate-aurora absolute bottom-0 right-0 h-80 w-80 rounded-full bg-amber-400/15 blur-3xl [animation-delay:-8s]" />
        </div>

        <div>
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[linear-gradient(135deg,#f59e0b,#fbbf24)] text-slate-900 shadow-lg shadow-amber-500/25 sm:h-12 sm:w-12">
            <Compass size={22} aria-hidden className="sm:h-6 sm:w-6" />
          </div>
          <h1 className="mt-4 mb-2 max-w-xl font-display text-2xl font-extrabold leading-[1.15] tracking-tight sm:mt-10 sm:mb-4 sm:text-3xl lg:text-[2.6rem] lg:leading-[1.08]">
            AI Career Compass <span className="text-teal-300">cho học sinh THPT</span>
          </h1>
          <p className="m-0 max-w-lg text-sm leading-relaxed text-white/70 sm:text-base lg:text-[17px]">
            Đăng nhập để vào dashboard, làm assessment, xem gợi ý nghề, mở lộ trình khám phá nghề và chat với AI
            Career Coach có guardrails.
          </p>
        </div>

        <p className="mt-2 flex items-center gap-2 text-xs text-white/50 sm:text-sm lg:mt-10">
          <ShieldCheck size={16} aria-hidden className="shrink-0 text-teal-300" />
          <span>Gợi ý chỉ mang tính tham khảo cho học sinh.</span>
        </p>
      </section>

      <section className="flex flex-1 items-center justify-center bg-white/40 p-4 py-8 backdrop-blur sm:p-8 lg:min-h-screen lg:grid lg:place-items-center">
        <div className="card w-full max-w-[440px] p-6 sm:p-8 animate-fade-up">
          <div className="mb-5 sm:mb-6">
            <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
              <ArrowLeft size={16} className="mr-1.5" />
              Quay lại trang chủ
            </Link>
          </div>
          <h2 className="m-0 font-display text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">Đăng nhập</h2>
          <p className="mt-1.5 sm:mt-2 mb-5 sm:mb-6 text-sm sm:text-base leading-relaxed text-slate-500">
            Nhập email và mật khẩu để tiếp tục.
          </p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
