import { Role, UserStatus, type Role as RoleType, type UserStatus as UserStatusType } from "@/lib/types";

export function roleLabel(role: RoleType) {
  switch (role) {
    case Role.ADMIN:
      return "Admin";
    case Role.STUDENT:
      return "Học sinh";
    case Role.GUEST:
      return "Dùng thử";
    default:
      return role;
  }
}

export function roleClass(role: RoleType) {
  switch (role) {
    case Role.ADMIN:
      return "bg-amber-100 text-amber-800 ring-1 ring-amber-500/25";
    case Role.STUDENT:
      return "bg-violet-100 text-violet-800 ring-1 ring-violet-500/25";
    case Role.GUEST:
      return "bg-teal-50 text-teal-700 ring-1 ring-teal-600/20";
    default:
      return "";
  }
}

export function statusLabel(status: UserStatusType) {
  return status === UserStatus.ACTIVE ? "Đang hoạt động" : "Đã khóa";
}

export function statusClass(status: UserStatusType) {
  return status === UserStatus.ACTIVE
    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
    : "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20";
}
