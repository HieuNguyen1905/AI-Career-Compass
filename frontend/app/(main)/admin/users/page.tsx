import { Plus, Save, Trash2 } from "lucide-react";
import {
  createUserAction,
  deleteUserAction,
  updateUserAction
} from "@/app/actions/admin";
import { AppShell } from "@/components/app-shell";
import { RoleBadge, StatusBadge } from "@/components/role-badge";
import { hasCompletedCurrentAssessment } from "@/lib/assessment-status";
import { requireRole } from "@/lib/auth";
import { listProfiles, listUsers } from "@/lib/data";
import { Role, UserStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const roleOptions = [Role.ADMIN, Role.STUDENT];
const statusOptions = [UserStatus.ACTIVE, UserStatus.DISABLED];

export default async function AdminUsersPage() {
  const user = await requireRole([Role.ADMIN]);
  const [users, profiles] = await Promise.all([listUsers(), listProfiles()]);

  return (
    <AppShell
      user={user}
      active="/admin/users"
      title="Quản trị người dùng"
      description="Tạo tài khoản, phân quyền và theo dõi trạng thái assessment của học sinh."
    >
      <section className="card mb-8 p-6">
        <h2 className="mb-4 font-display text-[17px] font-bold leading-tight tracking-tight text-slate-900">Tạo người dùng mới</h2>
        <form className="grid grid-cols-1 gap-4 lg:grid-cols-3" action={createUserAction}>
          <div className="grid gap-2">
            <label htmlFor="name" className="field-label">Họ tên</label>
            <input className="field" id="name" name="name" required />
          </div>
          <div className="grid gap-2">
            <label htmlFor="email" className="field-label">Email</label>
            <input className="field" id="email" name="email" type="email" required />
          </div>
          <div className="grid gap-2">
            <label htmlFor="password" className="field-label">Mật khẩu</label>
            <input className="field" id="password" name="password" type="password" minLength={6} required />
          </div>
          <div className="grid gap-2">
            <label htmlFor="role" className="field-label">Vai trò</label>
            <select className="field" id="role" name="role" defaultValue={Role.STUDENT}>
              {roleOptions.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <label htmlFor="gradeLevel" className="field-label">Lớp</label>
            <select className="field" id="gradeLevel" name="gradeLevel" defaultValue="11">
              <option value="">Không áp dụng</option>
              <option value="10">Lớp 10</option>
              <option value="11">Lớp 11</option>
              <option value="12">Lớp 12</option>
            </select>
          </div>
          <div className="grid gap-2">
            <label className="field-label hidden lg:block">&nbsp;</label>
            <button className="btn btn-primary mt-auto" type="submit">
              <Plus size={18} aria-hidden />
              Tạo người dùng
            </button>
          </div>
        </form>
      </section>

      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="m-0 font-display text-xl font-bold leading-tight tracking-tight text-slate-900">Danh sách người dùng</h2>
        <span className="chip-slate">{users.length} tài khoản</span>
      </div>

      <div className="card w-full overflow-hidden p-0">
        <div className="w-full overflow-x-auto no-scrollbar">
          <table className="w-full border-collapse text-left text-sm min-w-[700px]">
            <thead>
              <tr>
                {["Người dùng", "Vai trò", "Trạng thái", "Lớp", "Assessment", "Thao tác"].map((head) => (
                  <th key={head} className="whitespace-nowrap border-b border-slate-200 bg-slate-50/80 px-4 py-3 font-bold text-slate-500">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((managedUser) => {
                const profile = profiles.find((item) => item.userId === managedUser.id);

                return (
                  <tr key={managedUser.id} className="transition-colors hover:bg-violet-50/50">
                    <td className="border-b border-slate-100 px-4 py-3 align-middle">
                      <strong className="block text-slate-900">{managedUser.name}</strong>
                      <div className="mt-0.5 text-sm text-slate-500">{managedUser.email}</div>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 align-middle">
                      <RoleBadge role={managedUser.role} />
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 align-middle">
                      <StatusBadge status={managedUser.status} />
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 align-middle">{managedUser.gradeLevel || profile?.gradeLevel || "-"}</td>
                    <td className="border-b border-slate-100 px-4 py-3 align-middle">
                      {hasCompletedCurrentAssessment(profile) ? (
                        <span className="chip-teal">Đã xong</span>
                      ) : (
                        <span className="chip-slate">Chưa làm</span>
                      )}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 align-middle">
                      <div className="flex flex-wrap gap-2">
                        <form className="flex flex-wrap items-center gap-2" action={updateUserAction.bind(null, managedUser.id)}>
                          <select className="field !min-h-0 !w-auto !py-1.5 text-sm" name="role" defaultValue={managedUser.role} aria-label="Role">
                            {roleOptions.map((role) => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                          <select className="field !min-h-0 !w-auto !py-1.5 text-sm" name="status" defaultValue={managedUser.status} aria-label="Status">
                            {statusOptions.map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                          <select className="field !min-h-0 !w-auto !py-1.5 text-sm" name="gradeLevel" defaultValue={managedUser.gradeLevel ?? ""} aria-label="Lớp">
                            <option value="">-</option>
                            <option value="10">10</option>
                            <option value="11">11</option>
                            <option value="12">12</option>
                          </select>
                          <button className="btn btn-secondary btn-sm" type="submit">
                            <Save size={16} aria-hidden />
                            Lưu
                          </button>
                        </form>
                        <form action={deleteUserAction.bind(null, managedUser.id)}>
                          <button className="btn btn-danger btn-sm" type="submit" disabled={managedUser.id === user.id}>
                            <Trash2 size={16} aria-hidden />
                            Xóa
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
