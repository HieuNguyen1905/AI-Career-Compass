import { AppShell } from "@/components/app-shell";
import { CareerManager } from "@/components/admin/career-manager";
import { requireRole } from "@/lib/auth";
import { listCareers } from "@/lib/data";
import { Role } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminCareersPage({
  searchParams
}: {
  searchParams?: Promise<{ cluster?: string }>;
}) {
  const user = await requireRole([Role.ADMIN]);
  const careers = await listCareers();
  const params = await searchParams;
  const selectedCluster = params?.cluster;
  const clusters = Array.from(new Set(careers.map((career) => career.cluster))).sort();

  return (
    <AppShell
      user={user}
      active="/admin/careers"
      title="Quản trị nghề"
      description="Thêm, cập nhật và quản lý kho nghề dùng cho matching engine."
    >
      <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="card p-5">
          <span className="block text-[13px] font-medium text-slate-500">Tổng nghề</span>
          <strong className="mt-2 block font-display text-2xl font-extrabold text-slate-900">{careers.length}</strong>
        </div>
        <div className="card p-5">
          <span className="block text-[13px] font-medium text-slate-500">Nhóm nghề</span>
          <strong className="mt-2 block font-display text-2xl font-extrabold text-slate-900">{clusters.length}</strong>
        </div>
      </section>

      <CareerManager careers={careers} initialCluster={selectedCluster} />
    </AppShell>
  );
}
