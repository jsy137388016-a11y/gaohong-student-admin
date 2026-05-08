"use client";

import { useActionState } from "react";
import { GraduationCap, LogIn } from "lucide-react";
import { loginAction } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, { error: "" });

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded bg-brand-600 text-white">
            <GraduationCap size={26} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-950">高宏教育三行校区管理系统</h1>
            <p className="text-sm text-slate-500">请使用三行校区管理后台账号登录</p>
          </div>
        </div>

        <form action={formAction} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">账号</span>
            <input
              name="username"
              required
              autoComplete="username"
              placeholder="请输入账号"
              className="h-11 w-full rounded border border-slate-300 px-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">密码</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="请输入密码"
              className="h-11 w-full rounded border border-slate-300 px-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          {state.error ? <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div> : null}
          <button
            disabled={pending}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded bg-brand-600 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogIn size={17} />
            {pending ? "登录中..." : "登录"}
          </button>
        </form>
      </div>
    </main>
  );
}
