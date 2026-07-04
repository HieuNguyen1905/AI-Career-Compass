"use client";

import { useState, useMemo } from "react";
import { Plus, Save, Trash2, Search, ChevronDown, ChevronUp } from "lucide-react";
import toast from "react-hot-toast";
import { CareerFields } from "./career-fields";
import { createCareerAction, updateCareerAction, deleteCareerAction } from "@/app/actions/admin";
import type { CareerPath } from "@/lib/types";

export function CareerManager({ careers, initialCluster }: { careers: CareerPath[], initialCluster?: string }) {
  const [search, setSearch] = useState("");
  const [selectedCluster, setSelectedCluster] = useState<string>(initialCluster || "All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const clusters = useMemo(() => {
    return Array.from(new Set(careers.map((c) => c.cluster))).sort();
  }, [careers]);

  const filteredCareers = useMemo(() => {
    return careers.filter((career) => {
      const matchCluster = selectedCluster === "All" || career.cluster === selectedCluster;
      const matchSearch = career.title.toLowerCase().includes(search.toLowerCase());
      return matchCluster && matchSearch;
    });
  }, [careers, search, selectedCluster]);

  const handleCreate = async (formData: FormData) => {
    const promise = createCareerAction(formData);
    toast.promise(promise, {
      loading: "Đang thêm...",
      success: "Thêm nghề thành công!",
      error: "Thêm thất bại"
    });
  };

  const handleUpdate = async (id: string, formData: FormData) => {
    const promise = updateCareerAction(id, formData);
    toast.promise(promise, {
      loading: "Đang lưu...",
      success: "Lưu nghề thành công!",
      error: "Lưu thất bại"
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa nghề này?")) return;
    const promise = deleteCareerAction(id);
    toast.promise(promise, {
      loading: "Đang xóa...",
      success: "Đã xóa nghề!",
      error: "Xóa thất bại"
    });
  };

  return (
    <div className="grid gap-6">
      {/* Create New Form */}
      <section className="card p-5">
        <h2 className="mb-3 m-0 font-display text-[15px] font-bold text-slate-900">Thêm nghề mới</h2>
        <form className="grid grid-cols-1 gap-3 lg:grid-cols-2" action={handleCreate}>
          <CareerFields />
          <div className="grid lg:col-span-2">
            <button className="btn btn-primary btn-sm w-fit mt-1" type="submit">
              <Plus size={16} aria-hidden />
              Thêm nghề
            </button>
          </div>
        </form>
      </section>

      {/* Filter and Search */}
      <div className="card p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Tìm kiếm nghề..."
              className="field !pl-9 text-sm py-1.5 min-h-[36px]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full md:w-auto shrink-0">
            <select
              className="field text-sm py-1.5 min-h-[36px] w-full md:w-auto md:min-w-[200px]"
              value={selectedCluster}
              onChange={(e) => setSelectedCluster(e.target.value)}
            >
              <option value="All">Tất cả nhóm nghề</option>
              {clusters.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500 font-medium px-1">
        <span>Đang hiển thị {filteredCareers.length} nghề</span>
      </div>

      {/* List */}
      <section className="grid gap-3">
        {filteredCareers.map((career) => (
          <article className="card p-0 overflow-hidden" key={career.id}>
            <div 
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => setExpandedId(expandedId === career.id ? null : career.id)}
            >
              <div className="flex-1 min-w-0 pr-2">
                <h3 className="m-0 font-display text-[15px] font-bold text-slate-900 truncate">{career.title}</h3>
                <p className="mt-0.5 text-xs text-slate-500 truncate">{career.cluster}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(career.id);
                  }}
                  title="Xóa nghề"
                >
                  <Trash2 size={16} />
                </button>
                <div className="p-2 text-slate-400">
                  {expandedId === career.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>
            </div>
            
            {expandedId === career.id && (
              <div className="border-t border-slate-100 p-5 bg-slate-50/50">
                <form className="grid grid-cols-1 gap-3 lg:grid-cols-2" action={(formData) => handleUpdate(career.id, formData)}>
                  <CareerFields career={career} />
                  <div className="mt-2 flex flex-wrap gap-3 lg:col-span-2">
                    <button className="btn btn-secondary btn-sm" type="submit">
                      <Save size={16} aria-hidden />
                      Lưu thay đổi
                    </button>
                  </div>
                </form>
              </div>
            )}
          </article>
        ))}
        {filteredCareers.length === 0 && (
          <div className="text-center p-8 text-slate-500 border border-dashed rounded-2xl border-slate-300">
            Không tìm thấy nghề nào phù hợp.
          </div>
        )}
      </section>
    </div>
  );
}
