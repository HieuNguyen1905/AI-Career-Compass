import type { Role, UserStatus } from "@/lib/types";
import { roleClass, roleLabel, statusClass, statusLabel } from "@/lib/labels";

export function RoleBadge({ role }: { role: Role }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-extrabold whitespace-nowrap ${roleClass(role)}`}>{roleLabel(role)}</span>;
}

export function StatusBadge({ status }: { status: UserStatus }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-extrabold whitespace-nowrap ${statusClass(status)}`}>{statusLabel(status)}</span>;
}
