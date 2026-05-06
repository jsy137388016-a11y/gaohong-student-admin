import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen,
  CalendarCheck,
  GraduationCap,
  Home,
  LogOut,
  MessageSquareText,
  School,
  Settings,
  ShieldAlert,
  Star,
  Users
} from "lucide-react";
import { logout } from "@/lib/auth";
import { roleLabels } from "@/lib/format";

const navItems = [
  { href: "/dashboard", label: "首页", icon: Home },
  { href: "/students", label: "学生管理", icon: Users },
  { href: "/classes", label: "班级管理", icon: School },
  { href: "/attendance", label: "考勤管理", icon: CalendarCheck },
  { href: "/discipline", label: "纪律管理", icon: ShieldAlert },
  { href: "/exams", label: "成绩管理", icon: BookOpen },
  { href: "/focus", label: "重点关注", icon: Star },
  { href: "/communications", label: "家校沟通", icon: MessageSquareText },
  { href: "/settings", label: "系统设置", icon: Settings }
];

export function DashboardLayout({
  children,
  user
}: {
  children: React.ReactNode;
  user: { name: string; username: string; role: string };
}) {
  async function logoutAction() {
    "use server";
    await logout();
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-slate-200 bg-white shadow-sm lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
            <GraduationCap size={22} />
          </div>
          <div>
            <div className="text-base font-semibold text-slate-950">高宏学生管理</div>
            <div className="text-xs text-slate-500">学校后台系统</div>
          </div>
        </div>
        <nav className="space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur lg:px-8">
          <div className="lg:hidden">
            <div className="text-base font-semibold text-slate-950">高宏学生管理</div>
            <div className="text-xs text-slate-500">后台系统</div>
          </div>
          <div className="hidden text-sm text-slate-500 lg:block">艺考文补机构学生管理后台</div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium text-slate-900">{user.name}</div>
              <div className="text-xs text-slate-500">{roleLabels[user.role] || user.role}</div>
            </div>
            <form action={logoutAction}>
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100"
                title="退出登录"
              >
                <LogOut size={17} />
              </button>
            </form>
          </div>
        </header>

        <div className="border-b border-slate-200 bg-white px-4 py-2 lg:hidden">
          <div className="flex gap-2 overflow-x-auto">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <main className="mx-auto max-w-[1440px] px-4 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
