import { redirect } from "next/navigation";
import {
  GraduationCap,
  LogOut,
} from "lucide-react";
import { ActionToast } from "@/components/action-toast";
import { MainNav } from "@/components/main-nav";
import { logout } from "@/lib/auth";
import { roleLabels } from "@/lib/format";

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
            <div className="text-base font-semibold text-slate-950">高宏学生管理系统</div>
            <div className="text-xs text-slate-500">学校运营管理平台</div>
          </div>
        </div>
        <MainNav />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur lg:px-8">
          <div className="lg:hidden">
            <div className="text-base font-semibold text-slate-950">高宏学生管理系统</div>
            <div className="text-xs text-slate-500">学校运营管理平台</div>
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
        <ActionToast />

        <div className="border-b border-slate-200 bg-white px-4 py-2 lg:hidden">
          <MainNav mobile />
        </div>

        <main className="mx-auto max-w-[1440px] px-4 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
