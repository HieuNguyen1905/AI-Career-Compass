"use client";

import {
  Bot,
  ClipboardList,
  Compass,
  Database,
  LayoutDashboard,
  LogOut,
  Sparkles,
  UserCog,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { type SessionUser } from "@/lib/auth";
import { Role } from "@/lib/types";
import { roleLabel } from "@/lib/labels";
import { RoleBadge } from "@/components/role-badge";

const userNavItems = [
  { href: "/dashboard", label: "Tổng quan", short: "Tổng quan", icon: LayoutDashboard },
  { href: "/assessment", label: "Đánh giá năng lực", short: "Đánh giá", icon: ClipboardList },
  { href: "/profile", label: "Hồ sơ năng lực", short: "Hồ sơ", icon: UserRound },
  { href: "/explore", label: "Gợi ý nghề", short: "Gợi ý", icon: Compass },
  { href: "/advisor", label: "AI Career Coach", short: "AI Coach", icon: Bot },
];

const adminNavItems = [
  { href: "/admin", label: "Dashboard", short: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/questions", label: "Quản trị câu hỏi", short: "Câu hỏi", icon: ClipboardList },
  { href: "/admin/careers", label: "Quản trị nghề", short: "Nghề", icon: Database },
  { href: "/admin/users", label: "Quản trị người dùng", short: "User", icon: UserCog },
];

function AuthActions({ isGuest }: { isGuest: boolean }) {
  if (isGuest) {
    return (
      <div className="grid grid-cols-2 gap-2">
        <Link
          className="flex items-center justify-center rounded-2xl px-3.5 py-2.5 font-bold text-white/75 transition-all hover:bg-white/12 hover:text-white"
          href="/login"
        >
          Đăng nhập
        </Link>
        <Link
          className="flex items-center justify-center rounded-2xl bg-white px-3.5 py-2.5 font-bold text-violet-800 transition-all hover:bg-white/90"
          href="/register"
        >
          Đăng ký
        </Link>
      </div>
    );
  }

  return (
    <form action={logoutAction}>
      <button
        className="flex w-full items-center justify-center gap-2 rounded-2xl px-3.5 py-2.5 font-bold text-white/75 transition-all hover:bg-white/12 hover:text-white"
        type="submit"
      >
        <LogOut size={18} aria-hidden />
        Đăng xuất
      </button>
    </form>
  );
}

function isNavItemActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/admin") return pathname === "/admin";
  if (href === "/explore") return pathname.startsWith("/explore") || pathname.startsWith("/careers");
  if (href === "/admin/users") return pathname.startsWith("/admin/users") || pathname.startsWith("/users");
  return pathname.startsWith(href);
}

export function NavigationShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = user.role === Role.ADMIN;
  const isGuest = user.role === Role.GUEST;
  const items = isAdmin ? adminNavItems : userNavItems;
  const homeHref = isAdmin ? "/admin" : "/dashboard";
  const helperText = isGuest
    ? "Dữ liệu chỉ được lưu tạm thời. Vui lòng đăng nhập để có trải nghiệm lâu dài"
    : isAdmin
      ? "Theo dõi dữ liệu, quản lý người dùng và cập nhật kho nghề cho hệ thống."
      : "Gợi ý chỉ để tham khảo, học sinh là người quyết định cuối cùng.";

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col gap-7 overflow-hidden bg-[linear-gradient(180deg,#4c1d95_0%,#6d28d9_54%,#7c3aed_100%)] p-5 text-white lg:flex">
        <Link href={homeHref} className="group flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,#fb923c,#fb7185)] text-white shadow-lg shadow-rose-500/30 transition-transform group-hover:scale-105">
            <Compass size={22} aria-hidden />
          </div>
          <div>
            <strong className="block font-display text-[15px] tracking-tight">AI Career Compass</strong>
            <span className="mt-0.5 block text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">AI20K-068</span>
          </div>
        </Link>

        <nav className="grid gap-1.5" aria-label="Điều hướng chính">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = isNavItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-bold transition-all duration-200 ${
                  isActive ? "bg-white text-violet-800 shadow-lg shadow-violet-900/20" : "text-white/75 hover:bg-white/12 hover:text-white"
                }`}
              >
                <Icon size={18} aria-hidden className={isActive ? "text-fuchsia-600" : ""} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto grid gap-3">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[linear-gradient(135deg,#fbbf24,#fb7185)] text-sm font-black uppercase text-white">
                {user.name.slice(0, 1)}
              </div>
              <div className="min-w-0">
                <strong className="block truncate text-sm">{user.name}</strong>
                <span className="block truncate text-xs text-white/55">{roleLabel(user.role)}</span>
              </div>
            </div>
            <span className="mt-2.5 block truncate text-xs text-white/45">{user.email}</span>
          </div>

          <div className="flex gap-2 rounded-2xl border border-white/15 bg-white/10 p-3 text-xs leading-relaxed text-white/70">
            <Sparkles size={15} aria-hidden className="mt-0.5 shrink-0 text-amber-300" />
            {helperText}
          </div>

          <AuthActions isGuest={isGuest} />
        </div>
      </aside>

      <div className="sticky top-0 z-30 flex w-full max-w-full items-center justify-between gap-2 overflow-hidden border-b border-violet-100 bg-white/85 px-3 py-2.5 backdrop-blur sm:gap-3 sm:px-4 sm:py-3 lg:hidden">
        <Link href={homeHref} className="flex min-w-0 shrink items-center gap-2 sm:gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,#7c3aed,#c026d3)] text-white shadow-md shadow-violet-500/30 sm:h-9 sm:w-9">
            <Compass size={18} aria-hidden />
          </span>
          <strong className="truncate font-display text-sm tracking-tight text-slate-900 sm:text-[15px]">Career Compass</strong>
        </Link>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <div className="max-w-[80px] truncate sm:max-w-none">
            <RoleBadge role={user.role} />
          </div>
          {isGuest ? (
            <Link className="btn btn-secondary btn-sm !px-2.5 text-xs sm:!px-3 sm:text-[13px]" href="/login">
              Đăng nhập
            </Link>
          ) : (
            <form action={logoutAction}>
              <button
                className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-violet-100 bg-white text-violet-700 transition-colors hover:bg-violet-50 sm:h-9 sm:w-9"
                type="submit"
                aria-label="Đăng xuất"
              >
                <LogOut size={16} aria-hidden className="sm:h-[17px] sm:w-[17px]" />
              </button>
            </form>
          )}
        </div>
      </div>

      <main className="min-w-0 w-full max-w-full px-3.5 pb-32 pt-5 sm:px-7 sm:py-8 lg:pb-10">
        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around gap-0.5 overflow-x-hidden border-t border-violet-100 bg-white/90 px-1 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur lg:hidden"
        aria-label="Điều hướng"
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = isNavItemActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 min-w-0 flex-col items-center gap-1 rounded-2xl px-1 py-1.5 text-[10px] font-bold transition-colors ${
                isActive ? "text-violet-700" : "text-slate-400"
              }`}
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl transition-all sm:h-9 sm:w-9 ${
                  isActive ? "bg-[linear-gradient(135deg,#7c3aed,#c026d3)] text-white shadow-md shadow-violet-500/40" : ""
                }`}
              >
                <Icon size={18} aria-hidden />
              </span>
              <span className="max-w-full truncate leading-none">{item.short}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
