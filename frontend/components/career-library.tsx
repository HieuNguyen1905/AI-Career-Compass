"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, X, ChevronRight, Briefcase, BookOpen, GraduationCap, BrainCircuit, ArrowRight } from "lucide-react";
import type { CareerMatch, CareerPath } from "@/lib/types";

export function CareerLibrary({ careers }: { careers: (CareerMatch | CareerPath)[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCluster, setSelectedCluster] = useState<string>("All");
  const [visibleCount, setVisibleCount] = useState(8);
  const [quickViewCareer, setQuickViewCareer] = useState<CareerMatch | CareerPath | null>(null);

  const clusters = useMemo(() => {
    const allClusters = careers.map((c) => c.cluster).filter(Boolean);
    return ["All", ...Array.from(new Set(allClusters))].sort();
  }, [careers]);

  const filteredCareers = useMemo(() => {
    return careers.filter((c) => {
      const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            c.cluster.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCluster = selectedCluster === "All" || c.cluster === selectedCluster;
      return matchesSearch && matchesCluster;
    });
  }, [careers, searchQuery, selectedCluster]);

  const visibleCareers = filteredCareers.slice(0, visibleCount);
  const hasMore = visibleCount < filteredCareers.length;

  return (
    <div className="flex flex-col gap-8">
      {/* Search and Filter */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full rounded-2xl border border-slate-200 bg-white p-3.5 pl-11 text-[15px] text-slate-900 shadow-sm transition-all focus:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-500/10 hover:border-slate-300"
            placeholder="Tìm kiếm nghề"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setVisibleCount(8);
            }}
          />
        </div>
        
        <div className="flex w-full overflow-x-auto pb-2 md:w-auto md:pb-0 hide-scrollbar scroll-smooth">
          <div className="flex gap-2">
            {clusters.map((cluster) => (
              <button
                key={cluster}
                onClick={() => {
                  setSelectedCluster(cluster);
                  setVisibleCount(8);
                }}
                className={`whitespace-nowrap rounded-full px-5 py-2.5 text-[14px] font-bold transition-all duration-300 ${
                  selectedCluster === cluster
                    ? "bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-md shadow-teal-600/20"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900"
                }`}
              >
                {cluster === "All" ? "🌟 Tất cả lĩnh vực" : cluster}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      {filteredCareers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200/50 mb-4">
            <Briefcase className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="font-display text-xl font-bold text-slate-900">Không tìm thấy kết quả</h3>
          <p className="mt-2 text-[15px] text-slate-500 max-w-md">Rất tiếc, chúng tôi không tìm thấy nghề nghiệp nào phù hợp với tìm kiếm của bạn. Hãy thử một từ khóa khác nhé.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleCareers.map((career) => (
            <div
              key={career.id}
              className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-teal-300 hover:shadow-xl hover:shadow-teal-900/5 cursor-pointer"
              onClick={() => setQuickViewCareer(career)}
            >
              <div>
                <span className="mb-4 inline-block max-w-full truncate rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 transition-colors group-hover:bg-teal-50 group-hover:text-teal-700">
                  {career.cluster}
                </span>
                <h3 className="mb-2 font-display text-[18px] font-bold leading-tight text-slate-900 transition-colors group-hover:text-teal-700 line-clamp-2 break-words">
                  {career.title}
                </h3>
                <p className="mb-4 text-[14px] leading-relaxed text-slate-500 line-clamp-3">
                  {career.summary}
                </p>
              </div>
              <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
                {'score' in career ? (
                  <span className="inline-flex items-center rounded-full bg-teal-50 px-3 py-1.5 text-[13px] font-bold text-teal-700">
                    Phù hợp: {career.score}%
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1.5 text-[13px] font-medium text-slate-500">
                    Chi tiết
                  </span>
                )}
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-all duration-300 group-hover:bg-teal-600 group-hover:text-white group-hover:shadow-md">
                  <ChevronRight size={18} className="transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => setVisibleCount((prev) => prev + 8)}
            className="group flex items-center gap-2 rounded-full border-2 border-slate-200 bg-white px-8 py-3.5 text-[15px] font-bold text-slate-700 shadow-sm transition-all hover:border-teal-500 hover:bg-teal-50 hover:text-teal-700"
          >
            Tải thêm nghề nghiệp
            <ChevronRight size={18} className="transition-transform group-hover:translate-y-0.5 group-hover:rotate-90" />
          </button>
        </div>
      )}

      {/* Quick View Modal */}
      {quickViewCareer && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setQuickViewCareer(null);
          }}
        >
          <div className="relative flex max-h-[calc(100dvh-2rem)] sm:max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 bg-gradient-to-br from-teal-50/50 to-white p-5 sm:p-8 shrink-0">
              <div className="pr-8 min-w-0">
                <span className="mb-3 inline-block max-w-full truncate rounded-lg bg-teal-100 px-3 py-1.5 text-[12px] font-bold uppercase tracking-wider text-teal-800">
                  {quickViewCareer.cluster}
                </span>
                <h2 className="font-display text-xl sm:text-3xl font-bold leading-tight text-slate-900 break-words">
                  {quickViewCareer.title}
                </h2>
              </div>
              <button
                onClick={() => setQuickViewCareer(null)}
                className="absolute right-4 top-4 sm:right-6 sm:top-6 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-red-100 hover:text-red-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto p-5 sm:p-8 flex-1 min-h-0">
              <p className="mb-8 text-[16px] leading-relaxed text-slate-600 border-l-4 border-teal-400 pl-4 bg-teal-50/30 py-2 rounded-r-xl">
                {quickViewCareer.summary}
              </p>
              
              <div className="grid gap-8 md:grid-cols-2">
                <div>
                  <h3 className="mb-4 flex items-center gap-2 text-[16px] font-bold text-slate-800">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                      <BookOpen size={16} className="text-blue-600" />
                    </div>
                    Kỹ năng cần thiết
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    {quickViewCareer.jobSkills && quickViewCareer.jobSkills.length > 0 ? (
                      quickViewCareer.jobSkills.slice(0, 6).map((skill, i) => (
                        <span className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13.5px] font-medium text-slate-700 shadow-sm" key={i}>
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500 italic text-[14px]">Đang cập nhật kỹ năng...</span>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="mb-4 flex items-center gap-2 text-[16px] font-bold text-slate-800">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100">
                      <GraduationCap size={16} className="text-indigo-600" />
                    </div>
                    Ngành học gợi ý
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    {quickViewCareer.majors && quickViewCareer.majors.length > 0 ? (
                      quickViewCareer.majors.slice(0, 4).map((major, i) => (
                        <span className="inline-flex rounded-lg border border-indigo-100 bg-indigo-50/80 px-3 py-1.5 text-[13.5px] font-medium text-indigo-800" key={i}>
                          {major}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500 italic text-[14px]">Đang cập nhật ngành học...</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-100 bg-slate-50/80 p-4 sm:p-8 shrink-0">
              <Link
                href={`/careers/${quickViewCareer.id}`}
                className="btn btn-primary flex w-full items-center justify-center gap-2 shadow-md shadow-teal-600/20 hover:shadow-lg hover:shadow-teal-600/30 py-3 text-[15px] sm:text-[16px]"
                onClick={() => setQuickViewCareer(null)}
              >
                <span>Khám phá chi tiết</span>
                <ArrowRight size={18} className="shrink-0 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/advisor"
                className="btn btn-secondary flex w-full items-center justify-center gap-2 border border-slate-200 bg-white py-3 text-[15px] sm:text-[16px] hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50"
                onClick={() => setQuickViewCareer(null)}
              >
                <BrainCircuit size={18} className="text-teal-600 shrink-0" />
                <span>Hỏi AI cố vấn</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
