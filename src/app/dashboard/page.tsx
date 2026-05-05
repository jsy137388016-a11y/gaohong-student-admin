import Link from "next/link";
import { AlertCircle, BookOpen, CalendarDays, MessageSquareWarning, School, Users } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageTitle, Panel } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { displayDateTime, scoreTotalFromSubjects } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { FollowUpItem } from "./FollowUpItem";

function StatCard({ title, value, icon: Icon, href }: { title: string; value: string | number; icon: React.ElementType; href: string }) {
  return (
    <Link href={href} className="rounded border border-slate-200 bg-white p-5 hover:border-brand-300 hover:bg-brand-50/30 transition-colors cursor-pointer">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">{title}</div>
          <div className="mt-2 text-3xl font-semibold text-slate-950">{value}</div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded bg-brand-50 text-brand-700">
          <Icon size={22} />
        </div>
      </div>
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
      <PageTitle title="首页数据看板" description="快速查看学校今日重点数据和最近待跟进事项。" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="学生总数" value={studentCount} icon={Users} href="/students" />
        <StatCard title="班级总数" value={classCount} icon={School} href="/classes" />
        <StatCard title="今日请假人数" value={todayLeaveCount} icon={CalendarDays} href="/attendance" />
        <StatCard title="本周违纪次数" value={weekDisciplineCount} icon={AlertCircle} href="/discipline" />
        <StatCard title="最近考试平均分" value={latestAverage} icon={BookOpen} href="/exams" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <Panel title="最近需要跟进的家校沟通事项">
          <div className="space-y-3">
            {followUps.length === 0 ? (
              <div className="text-sm text-slate-500">暂无待跟进事项</div>
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
            <Link href="/students" className="flex items-center justify-between rounded border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
              学生档案管理 <Users size={16} />
            </Link>
            <Link href="/attendance" className="flex items-center justify-between rounded border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
              今日考勤记录 <CalendarDays size={16} />
            </Link>
            <Link href="/communications" className="flex items-center justify-between rounded border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
              家校沟通跟进 <MessageSquareWarning size={16} />
            </Link>
          </div>
        </Panel>
      </div>
    </DashboardLayout>
  );
}
