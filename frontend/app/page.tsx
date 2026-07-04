import { ArrowRight, Bot, Compass, ShieldCheck, Sparkles, Target, Zap } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

const flowSteps = [
  { title: "Đánh giá đa chiều", desc: "Sở thích, kỹ năng & giá trị" },
  { title: "Phân tích hồ sơ", desc: "Nhận diện thế mạnh tiềm ẩn" },
  { title: "Khám phá nghề nghiệp", desc: "Top 5 lĩnh vực phù hợp nhất" },
  { title: "Xây dựng lộ trình", desc: "Môn học & hoạt động trải nghiệm" },
  { title: "AI Career Coach", desc: "Đồng hành và giải đáp thắc mắc" }
];

const features = [
  {
    icon: Target,
    title: "Thấu hiểu bản thân",
    desc: "Khám phá sâu sắc về thế mạnh, sở thích và giá trị cốt lõi của bạn thông qua bài đánh giá 32 câu hỏi được thiết kế khoa học.",
    tone: "from-teal-500 to-emerald-400"
  },
  {
    icon: Compass,
    title: "Định hướng thông minh",
    desc: "Thuật toán sẽ phân tích dữ liệu đa chiều để đưa ra các gợi ý nghề nghiệp chính xác với tỉ lệ phù hợp rõ ràng.",
    tone: "from-sky-500 to-cyan-400"
  },
  {
    icon: Bot,
    title: "Trợ lý AI đồng hành",
    desc: "Trò chuyện trực tiếp với AI Coach thấu hiểu hồ sơ của bạn, sẵn sàng giải đáp và định hướng một cách khách quan nhất.",
    tone: "from-amber-500 to-orange-400"
  }
];

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50">
      {/* Dynamic Background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-30 [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
        <div className="animate-aurora absolute -top-32 -left-24 h-[32rem] w-[32rem] rounded-full bg-teal-400/20 blur-[100px]" />
        <div className="animate-aurora absolute top-20 right-0 h-[28rem] w-[28rem] rounded-full bg-amber-400/20 blur-[100px] [animation-delay:-6s]" />
        <div className="animate-aurora absolute bottom-0 left-1/3 h-[30rem] w-[30rem] rounded-full bg-emerald-400/15 blur-[100px] [animation-delay:-12s]" />
      </div>

      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 sm:px-6 py-4 sm:py-5 relative z-10">
        <Link className="group flex items-center gap-2 sm:gap-3 text-slate-900 min-w-0 pr-1" href="/">
          <div className="grid h-9 w-9 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-teal-600 to-teal-500 text-white shadow-lg shadow-teal-500/30 transition-transform group-hover:scale-105 group-hover:shadow-teal-500/40">
            <Compass size={20} aria-hidden className="transition-transform group-hover:rotate-12 sm:h-6 sm:w-6" />
          </div>
          <div className="flex flex-col min-w-0">
            <strong className="font-display text-[13px] sm:text-[17px] font-extrabold leading-tight tracking-tight text-slate-800 truncate">AI Career Compass</strong>
            <span className="mt-0.5 text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.08em] sm:tracking-[0.2em] text-teal-600 truncate">Định hướng tương lai</span>
          </div>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-4 shrink-0" aria-label="Điều hướng chính">
          <Link href="/login" className="text-[13px] sm:text-[15px] font-semibold text-slate-600 transition-colors hover:text-teal-700 px-2 sm:px-3 py-1.5 rounded-lg hover:bg-slate-100/80 whitespace-nowrap">
            Đăng nhập
          </Link>
          <Link className="btn btn-primary !px-3.5 sm:!px-5 !py-1.5 sm:!py-2.5 text-[13px] sm:text-[15px] shadow-md hover:shadow-lg transition-shadow whitespace-nowrap" href="/register">
            Đăng ký
          </Link>
        </nav>
      </header>

      <section className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:flex-row lg:gap-16 lg:py-16 relative z-10">
        <div className="flex flex-1 flex-col items-center text-center lg:items-start lg:text-left w-full">
          <div className="mb-5 sm:mb-6 inline-flex items-center gap-2 rounded-full border border-teal-200/50 bg-teal-50/50 px-3.5 py-1.5 sm:px-4 sm:py-2 backdrop-blur-sm animate-fade-up shadow-sm">
            <Sparkles size={15} className="text-amber-500 shrink-0 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm font-semibold text-teal-800">Khám phá tiềm năng cùng AI Coach</span>
          </div>
          
          <h1 className="m-0 mb-4 sm:mb-5 font-display text-3xl sm:text-[2.75rem] font-extrabold leading-[1.15] tracking-tight text-slate-900 animate-fade-up [animation-delay:80ms] lg:text-[3.2rem] break-words">
            Định hướng nghề nghiệp <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-teal-600 to-amber-500 bg-clip-text text-transparent">phù hợp với bản thân</span>
          </h1>
          
          <p className="mb-7 sm:mb-8 max-w-2xl text-base sm:text-[1.1rem] leading-relaxed text-slate-600 animate-fade-up [animation-delay:160ms]">
            Nền tảng AI thông minh giúp bạn thấu hiểu thế mạnh, khám phá các lĩnh vực tiềm năng và xây dựng lộ trình phát triển rõ ràng. Tự tin bước vào tương lai với những quyết định chính xác.
          </p>
          
          <div className="flex w-full flex-col sm:flex-row sm:flex-wrap items-center justify-center gap-3 sm:gap-4 animate-fade-up [animation-delay:240ms] lg:justify-start">
            <Link className="btn btn-primary group w-full sm:w-auto px-6 sm:px-8 py-3.5 text-sm sm:text-[15px] shadow-lg shadow-teal-600/20 hover:shadow-xl hover:shadow-teal-600/30 transition-all justify-center" href="/register">
              <span>Khám phá bản thân ngay</span>
              <ArrowRight size={18} className="ml-2 transition-transform group-hover:translate-x-1 shrink-0" />
            </Link>
            <Link 
              className="btn group relative w-full sm:w-auto overflow-hidden bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-200 px-5 sm:px-8 py-3.5 text-xs sm:text-[15px] font-bold text-amber-900 shadow-lg shadow-amber-400/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-amber-400/40 justify-center" 
              href="/dashboard"
            >
              <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(150%)]">
                <div className="w-12 bg-white/60 blur-md" />
              </div>
              <span className="relative flex items-center justify-center gap-2 text-center">
                <Sparkles size={18} className="animate-pulse text-amber-700 shrink-0" />
                <span>Dùng thử không cần đăng nhập</span>
              </span>
            </Link>
          </div>
        </div>

        <div className="relative w-full max-w-full sm:max-w-md animate-fade-up [animation-delay:200ms] lg:w-[480px]">
          <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-to-br from-teal-200/40 via-white/40 to-amber-200/30 blur-2xl" />
          <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/60 p-1 backdrop-blur-xl shadow-2xl shadow-slate-200/50">
            <div className="rounded-[1.4rem] border border-white bg-white p-4 sm:p-6">
              <div className="mb-4 sm:mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <span className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-xl bg-teal-50 text-teal-600">
                    <Zap size={18} />
                  </span>
                  <strong className="font-display text-sm sm:text-[16px] font-bold text-slate-800">Hành trình của bạn</strong>
                </div>
              </div>
              <ol className="relative grid gap-2.5 sm:gap-3 border-l-2 border-slate-100 ml-3 sm:ml-4">
                {flowSteps.map((step, i) => (
                  <li
                    key={step.title}
                    className="group relative pl-4 sm:pl-5 transition-all hover:-translate-y-0.5"
                  >
                    <span className="absolute -left-[15px] sm:-left-[17px] top-0.5 grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-full bg-white border-2 border-teal-500 text-xs font-black text-teal-600 shadow-sm transition-colors group-hover:bg-teal-500 group-hover:text-white">
                      {i + 1}
                    </span>
                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 sm:p-3 transition-all group-hover:border-teal-200 group-hover:bg-white group-hover:shadow-md">
                      <strong className="block text-sm sm:text-[15px] font-bold text-slate-800">{step.title}</strong>
                      <span className="mt-0.5 sm:mt-1 block text-xs sm:text-[13.5px] text-slate-500">{step.desc}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 pb-20 sm:pb-24 mt-8 sm:mt-10">
        <div className="mb-8 sm:mb-12 text-center animate-fade-up [animation-delay:300ms]">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 break-words">Tại sao chọn AI Career Compass?</h2>
          <p className="mt-3 sm:mt-4 text-sm sm:text-[16px] text-slate-600">Phương pháp khoa học kết hợp công nghệ AI tiên tiến</p>
        </div>
        
        <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-3">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 text-center shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-teal-200 hover:shadow-xl animate-fade-up"
                style={{ animationDelay: `${(i + 4) * 90}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <span className={`relative mx-auto mb-5 sm:mb-6 grid h-14 w-14 sm:h-16 sm:w-16 place-items-center rounded-2xl bg-gradient-to-br ${feature.tone} text-white shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                  <Icon size={26} className="sm:h-7 sm:w-7" />
                </span>
                <h3 className="relative mb-2 sm:mb-3 font-display text-lg sm:text-xl font-bold text-slate-900">{feature.title}</h3>
                <p className="relative text-sm sm:text-[15px] leading-relaxed text-slate-600">{feature.desc}</p>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="relative z-10 mt-auto border-t border-slate-200/80 bg-white px-6 py-8 text-center">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-4">
          <div className="inline-flex max-w-2xl items-center justify-center gap-2 rounded-lg bg-teal-50 px-4 py-2 text-[13px] font-medium text-teal-800 text-left sm:text-center">
            <ShieldCheck size={16} className="text-teal-600 shrink-0" />
            AI đóng vai trò tư vấn tham khảo, không thay thế chuyên gia hướng nghiệp hay quyết định cá nhân.
          </div>
          <p className="text-[13px] text-slate-400">© 2026 AI Career Compass. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
