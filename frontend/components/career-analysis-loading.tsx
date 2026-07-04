"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BrainCircuit, Sparkles } from "lucide-react";

const LOADING_MESSAGES = [
  "Đang phân tích tỉ mỉ các câu trả lời của bạn...",
  "Đang đối chiếu với bản đồ kỹ năng nghề nghiệp...",
  "Đang tìm kiếm Top 5 ngành nghề phù hợp nhất...",
  "Đang tổng hợp điểm mạnh và thiết kế lộ trình...",
  "Hệ thống đang hoàn tất dữ liệu, sắp xong rồi...",
];

export function CareerAnalysisLoading() {
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    setMounted(true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Progress bar animation (eases to 99% over ~18s)
    const startTime = Date.now();
    const duration = 18000;

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      // easeOutQuart for smooth curve
      const easeOut = 1 - Math.pow(1 - t, 4);
      
      setProgress(Math.floor(easeOut * 99));

      if (t < 1) {
        requestAnimationFrame(updateProgress);
      }
    };
    
    const animFrame = requestAnimationFrame(updateProgress);

    // Message rotation every 3.5 seconds
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 3500);

    return () => {
      document.body.style.overflow = previousOverflow;
      cancelAnimationFrame(animFrame);
      clearInterval(messageInterval);
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      aria-busy="true"
      aria-live="polite"
      className="fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-slate-950/35 px-5 backdrop-blur-md"
      role="status"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.18),transparent_48%)]" />

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/70 bg-white/95 p-7 text-center shadow-2xl shadow-slate-950/25 sm:p-9">
        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-teal-200/50 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-violet-200/50 blur-3xl" />

        <div className="relative mx-auto grid h-20 w-20 place-items-center">
          <div className="absolute inset-0 animate-spin rounded-full border-[5px] border-teal-100 border-t-teal-600" />
          <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-teal-50 to-violet-50 text-teal-700 shadow-inner">
            <BrainCircuit size={28} aria-hidden />
          </div>
        </div>

        <div className="relative mt-6">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
            <Sparkles size={14} aria-hidden />
            AI đang xử lý
          </div>
          <h2 className="m-0 font-display text-2xl font-extrabold tracking-tight text-slate-950">
            Đang phân tích kết quả của bạn
          </h2>
          <div className="mx-auto mb-0 mt-3 flex min-h-[48px] max-w-sm items-center justify-center text-sm leading-6 text-slate-600">
            <p className="m-0 animate-pulse">
              {LOADING_MESSAGES[messageIndex]}
            </p>
          </div>
        </div>

        <div className="relative mt-6">
          <div className="mb-2 flex items-center justify-between text-xs font-bold">
            <span className="text-slate-500">Tiến độ phân tích</span>
            <span className="text-teal-600">{progress}%</span>
          </div>
          <div className="overflow-hidden rounded-full bg-slate-100">
            <div 
              className="h-2.5 rounded-full bg-gradient-to-r from-teal-500 via-cyan-400 to-violet-500 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <p className="relative mb-0 mt-5 text-xs font-medium text-slate-500">
          Kết quả được cá nhân hóa hoàn toàn. Vui lòng không đóng trình duyệt.
        </p>
      </div>
    </div>,
    document.body
  );
}
