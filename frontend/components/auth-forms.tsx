"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { loginAction, registerAction } from "@/app/actions/auth";

function SubmitButton({
  label,
  pendingLabel,
  icon
}: {
  label: string;
  pendingLabel: string;
  icon: React.ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <button className="btn btn-primary mt-1 disabled:opacity-60 disabled:cursor-not-allowed" type="submit" disabled={pending}>
      {icon}
      {pending ? pendingLabel : label}
    </button>
  );
}

function PasswordField({
  autoComplete,
  minLength
}: {
  autoComplete: string;
  minLength?: number;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const label = showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu";

  return (
    <div className="grid gap-2">
      <label htmlFor="password" className="field-label">Mật khẩu</label>
      <div className="relative">
        <input
          className="field pr-12"
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={minLength}
          required
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/20"
          onClick={() => setShowPassword((value) => !value)}
          aria-label={label}
          title={label}
          aria-pressed={showPassword}
        >
          {showPassword ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
        </button>
      </div>
    </div>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, {});

  return (
    <form className="grid gap-4" action={formAction}>
      <div className="grid gap-2">
        <label htmlFor="email" className="field-label">Email</label>
        <input className="field" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <PasswordField autoComplete="current-password" />
      {state.error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm leading-relaxed text-rose-700">{state.error}</div> : null}
      <SubmitButton label="Đăng nhập" pendingLabel="Đang đăng nhập" icon={<LogIn size={18} aria-hidden />} />
      <Link className="btn btn-secondary" href="/register">
        <UserPlus size={18} aria-hidden />
        Tạo tài khoản học sinh
      </Link>
    </form>
  );
}

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, {});

  return (
    <form className="grid gap-4" action={formAction}>
      <div className="grid gap-2">
        <label htmlFor="name" className="field-label">Họ tên</label>
        <input className="field" id="name" name="name" autoComplete="name" required />
      </div>
      <div className="grid gap-2">
        <label htmlFor="email" className="field-label">Email</label>
        <input className="field" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="grid gap-2">
        <label htmlFor="gradeLevel" className="field-label">Lớp hiện tại</label>
        <select className="field" id="gradeLevel" name="gradeLevel" defaultValue="11">
          <option value="10">Lớp 10</option>
          <option value="11">Lớp 11</option>
          <option value="12">Lớp 12</option>
        </select>
      </div>
      <PasswordField autoComplete="new-password" minLength={6} />
      {state.error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm leading-relaxed text-rose-700">{state.error}</div> : null}
      <SubmitButton label="Tạo tài khoản" pendingLabel="Đang tạo" icon={<ArrowRight size={18} aria-hidden />} />
      <Link className="btn btn-secondary" href="/login">
        <LogIn size={18} aria-hidden />
        Quay lại đăng nhập
      </Link>
    </form>
  );
}
