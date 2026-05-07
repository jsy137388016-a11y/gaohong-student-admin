import Link from "next/link";
import { AlertCircle, ArrowRight, BookOpen, CalendarDays, MessageSquareWarning, School, Users } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { EmptyText, Panel } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { displayDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { FollowUpItem } from "./FollowUpItem";

function StatCard({
  title,
  value,
  icon: Icon,
  href,
  tone
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  href: string;
  tone: "blue" | "emerald" | "amber" | "red" | "violet";
}) {
  const tones = {
    blue: "border-blue-100 bg-blue-50 text-blue-700 group-hover:bg-blue-100",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100",
    amber: "border-amber-100 bg-amber-50 text-amber-700 group-hover:bg-amber-100",
    red: "border-red-100 bg-red-50 text-red-700 group-hover:bg-red-100",
    violet: "border-violet-100 bg-violet-50 text-violet-700 group-hover:bg-violet-100"
  };

  return (
    <Link href={href} className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-transparent transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md hover:ring-brand-100">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-slate-500">{title}</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">{value}</div>
          <div className="mt-2 text-xs text-slate-400">点击查看明细数据</div>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl border transition-colors ${tones[tone]}`}>
          <Icon size={22} />
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-medium text-slate-400 group-hover:text-brand-700">
        <span>进入模块</span>
        <ArrowRight size={13} />
      </div>
    </Link>
  );
}

function QuickEntry({ href, title, description, icon: Icon }: { href: string; title: string; description: string; icon: React.ElementType }) {
  return (
    <Link href={href} className="group flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-brand-200 hover:bg-brand-50/40">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-brand-100 group-hover:text-brand-700">
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-slate-950">{title}</div>
        <div className="mt-0.5 text-xs leading-5 text-slate-500">{description}</div>
      </div>
      <ArrowRight size={16} className="text-slate-300 group-hover:text-brand-600" />
    </Link>
  );
}

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));

  let studentCount = 0;
  let classCount = 0;
  let todayLeaveCount = 0;
  let weekDisciplineCount = 0;
  let latestExam: any = null;
  let followUps: any[] = [];

  try {
    [studentCount, classCount, todayLeaveCount, weekDisciplineCount, latestExam, followUps] = await Promise.all([
      prisma.student.count({ where: { status: "active" } }),
      prisma.classRoom.count(),
      prisma.attendance.count({ where: { type: "leave", date: { gte: startOfToday, lt: endOfToday } } }),
      prisma.discipline.count({ where: { recordedAt: { gte: startOfWeek } } }),
      prisma.exam.findFirst({ include: { scores: true }, orderBy: { examDate: "desc" } }),
      prisma.communication.findMany({
        where: { followUp: { not: null } },
        include: { student: true },
        orderBy: { contactedAt: "desc" },
        take: 5
      })
    ]);
  } catch {
    // D1 查询异常时降级：尝试不带 status 过滤的简单查询
    try {
      [studentCount, classCount, todayLeaveCount, weekDisciplineCount] = await Promise.all([
        prisma.student.count({}),
        prisma.classRoom.count({}),
        prisma.attendance.count({ where: { type: "leave" } }),
        prisma.discipline.count({})
      ]);
    } catch {
      // 完全失败，保留默认值 0
    }
  }

  const latestAverage =
    latestExam && latestExam.scores && latestExam.scores.length
      ? (latestExam.scores.reduce((sum: number, item: any) => sum + (item.score || 0), 0) / latestExam.scores.length).toFixed(1)
      : "-";

  return (
    <DashboardLayout user={user}>
      <div className="mb-7 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-medium text-brand-700">运营概览</div>
            <h1 className="mt-2 text-[28px] font-semibold leading-tight text-slate-950">首页数据看板</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">快速查看学校今日重点数据、风险提醒和最近待跟进事项。</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
            当前登录：<span className="font-medium text-slate-900">{user.name}</span>
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="学生总数" value={studentCount} icon={Users} href="/students" tone="blue" />
        <StatCard title="班级总数" value={classCount} icon={School} href="/classes" tone="emerald" />
        <StatCard title="今日请假人数" value={todayLeaveCount} icon={CalendarDays} href="/attendance" tone="amber" />
        <StatCard title="本周违纪次数" value={weekDisciplineCount} icon={AlertCircle} href="/discipline" tone="red" />
        <StatCard title="最近考试平均分" value={latestAverage} icon={BookOpen} href="/exams" tone="violet" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_420px]">
        <Panel title="最近需要跟进的家校沟通事项">
          <div className="space-y-3">
            {followUps.length === 0 ? (
              <EmptyText />
            ) : (
              followUps.map((item) => (
                <FollowUpItem
                  key={item.id}
                  id={item.id}
                  studentId={item.studentId}
                  studentName={item.student.name}
                  target={item.target}
                  followUp={item.followUp || "无跟进内容"}
                  contactedAt={displayDateTime(item.contactedAt)}
                />
              ))
            )}
          </div>
        </Panel>

        <Panel title="常用入口">
          <div className="grid gap-3">
            <QuickEntry href="/students" title="学生档案管理" description="查看学生资料、班级归属和重点关注状态" icon={Users} />
            <QuickEntry href="/attendance" title="今日考勤记录" description="录入请假、迟到、旷课、早退等考勤状态" icon={CalendarDays} />
            <QuickEntry href="/discipline" title="纪律与扣分" description="查看违纪处理记录和德育扣分情况" icon={AlertCircle} />
            <QuickEntry href="/communications" title="家校沟通跟进" description="沉淀沟通记录和后续跟进事项" icon={MessageSquareWarning} />
          </div>
        </Panel>
      </div>
    </DashboardLayout>
  );
}
