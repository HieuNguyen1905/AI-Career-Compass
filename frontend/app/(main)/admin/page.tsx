import type { LucideIcon } from "lucide-react";
import { BarChart3, Database, ShieldCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { RoleBadge, StatusBadge } from "@/components/role-badge";
import { hasCompletedCurrentAssessment } from "@/lib/assessment-status";
import { requireRole } from "@/lib/auth";
import { getCareerMatches } from "@/lib/career-engine";
import { listCareers, listProfiles, listUsers } from "@/lib/data";
import { Role } from "@/lib/types";

export const dynamic = "force-dynamic";

const roleNotes = {
  [Role.ADMIN]: "Quản trị cấu hình, người dùng và dữ liệu nền.",
  [Role.STUDENT]: "Làm assessment và nhận gợi ý nghề nghiệp."
};

export default async function AdminDashboardPage() {
  const user = await requireRole([Role.ADMIN]);
  const [users, profiles, careers] = await Promise.all([
    listUsers(),
    listProfiles(),
    listCareers()
  ]);

  const completedProfiles = profiles.filter(hasCompletedCurrentAssessment);
  const topClusters = completedProfiles.reduce<Record<string, number>>((counts, profile) => {
    const [match] = getCareerMatches(profile, careers);
    if (match) counts[match.cluster] = (counts[match.cluster] ?? 0) + 1;
    return counts;
  }, {});
  const roleCounts = {
    [Role.ADMIN]: users.filter((item) => item.role === Role.ADMIN).length,
    [Role.STUDENT]: users.filter((item) => item.role === Role.STUDENT).length
  };
  const topClusterEntries = Object.entries(topClusters).sort((a, b) => b[1] - a[1]);
  const careerClusterCounts = careers.reduce<Record<string, number>>((counts, career) => {
    counts[career.cluster] = (counts[career.cluster] ?? 0) + 1;
    return counts;
  }, {});
  const recentUsers = users.slice(0, 5);

  return (
    <AppShell
      user={user}
      active="/admin"
      title="Dashboard admin"
      description="Theo dõi dữ liệu người dùng, tiến độ assessment và kho nghề nghiệp."
    >
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <StatCard icon={UsersRound} label="Tổng người dùng" value={users.length} />
        <StatCard icon={BarChart3} label="Assessment hoàn thành" value={completedProfiles.length} />
        <StatCard icon={Database} label="Nghề trong database" value={careers.length} />
        <StatCard icon={ShieldCheck} label="Tài khoản admin" value={roleCounts.ADMIN} />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="card p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="m-0 font-display text-xl font-bold leading-tight text-slate-900">Vai trò người dùng</h2>
              <p className="mt-1 text-sm text-slate-500">Tách rõ từng nhóm tài khoản thay vì so tỷ lệ bằng thanh dài.</p>
            </div>
            <Link className="btn btn-secondary btn-sm" href="/admin/users">
              Mở danh sách user
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {([Role.ADMIN, Role.STUDENT] as const).map((role) => (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4" key={role}>
                <div className="flex items-center justify-between gap-3">
                  <RoleBadge role={role} />
                  <strong className="font-display text-2xl font-extrabold text-slate-950">{roleCounts[role]}</strong>
                </div>
                <p className="mt-3 min-h-[40px] text-sm leading-5 text-slate-500">{roleNotes[role]}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="m-0 font-display text-xl font-bold leading-tight text-slate-900">Nhóm nghề được gợi ý nhiều</h2>
              <p className="mt-1 text-sm text-slate-500">Dựa trên nghề phù hợp nhất của các assessment đã hoàn thành.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {topClusterEntries.length > 0 ? (
              topClusterEntries.map(([cluster, count]) => {
                const careerCount = careerClusterCounts[cluster] ?? 0;

                return (
                  <Link
                    className="group rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-teal-200 hover:bg-teal-50/60"
                    href={`/admin/careers?cluster=${encodeURIComponent(cluster)}`}
                    key={cluster}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <strong className="block text-sm font-extrabold text-slate-900 group-hover:text-teal-800">{cluster}</strong>
                        <span className="mt-1 block text-xs font-semibold text-slate-500">
                          {careerCount} nghề trong nhóm này
                        </span>
                      </div>
                      <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-extrabold text-teal-700">
                        {count} hồ sơ
                      </span>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                Chưa có đủ assessment để thống kê nhóm nghề được gợi ý.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="card mt-6 overflow-hidden p-0">
        <div className="border-b border-slate-100 p-5">
          <h2 className="m-0 font-display text-xl font-bold leading-tight text-slate-900">Người dùng mới nhất</h2>
        </div>
        <div className="w-full overflow-x-auto no-scrollbar">
          <table className="w-full border-collapse text-left text-sm min-w-[500px]">
            <thead>
              <tr>
                {["Người dùng", "Vai trò", "Trạng thái", "Lớp"].map((head) => (
                  <th key={head} className="whitespace-nowrap border-b border-slate-200 bg-slate-50/80 px-4 py-3 font-bold text-slate-500">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((managedUser) => (
                <tr key={managedUser.id} className="transition-colors hover:bg-violet-50/50">
                  <td className="border-b border-slate-100 px-4 py-3">
                    <strong className="block text-slate-900">{managedUser.name}</strong>
                    <span className="text-sm text-slate-500">{managedUser.email}</span>
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3">
                    <RoleBadge role={managedUser.role} />
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3">
                    <StatusBadge status={managedUser.status} />
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3">{managedUser.gradeLevel || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="card card-hover flex items-start justify-between gap-3 p-5">
      <div>
        <span className="block text-[13px] font-medium text-slate-500">{label}</span>
        <strong className="mt-2 block font-display text-2xl font-extrabold leading-none tracking-tight text-slate-900">{value}</strong>
      </div>
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-lg">
        <Icon size={22} aria-hidden />
      </span>
    </div>
  );
}
