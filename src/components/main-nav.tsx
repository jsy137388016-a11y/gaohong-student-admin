"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarCheck,
  Home,
  MessageSquareText,
  School,
  Settings,
  ShieldAlert,
  Star,
  Users
} from "lucide-react";
import type { ModuleKey } from "@/lib/permissions";

const navItems: Array<{ module: ModuleKey; href: string; label: string; icon: React.ReactNode }> = [
  { module: "dashboard", href: "/dashboard", label: "首页", icon: <Home className="h-[18px] w-[18px]" /> },
  { module: "students", href: "/students", label: "学生管理", icon: <Users className="h-[18px] w-[18px]" /> },
  { module: "classes", href: "/classes", label: "班级管理", icon: <School className="h-[18px] w-[18px]" /> },
  { module: "attendance", href: "/attendance", label: "考勤管理", icon: <CalendarCheck className="h-[18px] w-[18px]" /> },
  { module: "discipline", href: "/discipline", label: "纪律管理", icon: <ShieldAlert className="h-[18px] w-[18px]" /> },
  { module: "exams", href: "/exams", label: "成绩管理", icon: <BookOpen className="h-[18px] w-[18px]" /> },
  { module: "focus", href: "/focus", label: "重点关注", icon: <Star className="h-[18px] w-[18px]" /> },
  { module: "communications", href: "/communications", label: "家校沟通", icon: <MessageSquareText className="h-[18px] w-[18px]" /> },
  { module: "settings", href: "/settings", label: "系统设置", icon: <Settings className="h-[18px] w-[18px]" /> }
];

function isActive(pathname: string, href: string) {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MainNav({ mobile = false, modules }: { mobile?: boolean; modules?: ModuleKey[] }) {
  const pathname = usePathname() || "";
  const items = modules?.length ? navItems.filter((item) => modules.includes(item.module)) : navItems;

  if (mobile) {
    return (
      <div className="flex gap-2 overflow-x-auto">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "border-brand-200 bg-brand-50 text-brand-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <nav className="space-y-1 px-3 py-4">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
              active
                ? "bg-brand-50 text-brand-700 shadow-sm ring-1 ring-brand-100"
                : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
