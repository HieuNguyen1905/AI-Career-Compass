import Link from "next/link";
import { Settings } from "lucide-react";
import { canManageUsers, type SessionUser } from "@/lib/auth";
import { RoleBadge } from "@/components/role-badge";

export function AppShell({
  user,
  active,
  title,
  description,
  children,
}: {
  user: SessionUser;
  active: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="animate-fade-up">
          <h1 className="m-0 font-display text-[26px] font-extrabold leading-tight tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>
          {description ? <p className="mt-1.5 max-w-2xl leading-relaxed text-slate-500">{description}</p> : null}
        </div>
        <div className="hidden flex-wrap items-center gap-2.5 sm:flex">
          <RoleBadge role={user.role} />
          {canManageUsers(user.role) && !active.startsWith("/admin") ? (
            <Link className="btn btn-secondary btn-sm" href="/admin">
              <Settings size={16} aria-hidden />
              Quản trị
            </Link>
          ) : null}
        </div>
      </header>
      <div className="animate-fade-up" style={{ animationDelay: "60ms" }}>
        {children}
      </div>
    </>
  );
}
