import { LoaderCircle } from "lucide-react";

export function PageLoading({ label = "Đang tải dữ liệu" }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center py-12">
      <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-sm font-bold text-slate-600 shadow-sm backdrop-blur">
        <LoaderCircle className="animate-spin text-teal-600" size={18} aria-hidden />
        <span>{label}</span>
      </div>
    </div>
  );
}
