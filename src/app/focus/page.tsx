import Link from "next/link";
import { Eye, Star } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { EmptyText, PageTitle, Panel, TableShell } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { boardingLabels, displayDateTime, genderLabels } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess, studentWhereForUser, classWhereForUser, scopeTypeOf } from "@/lib/permissions";

const levelLabels: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高",
  urgent: "紧急"
};

const levelColors: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800"
};

const warningStatusLabels: Record<string, string> = {
  pending: "待处理",
  processing: "处理中",
  resolved: "已解决"
};

export default async function FocusPage() {
  const user = await requireUser();
  requireModuleAccess(user, "focus");
  const isHeadTeacher = scopeTypeOf(user) === "class";

  // 查询预警记录（优先展示 WarningRecord）
  let warnings: any[] = [];
  try {
    warnings = await prisma.warningRecord.findMany({
      where: {
        status: { not: "resolved" },
        student: studentWhereForUser(user)
      },
      include: { student: { include: { classRoom: true } } },
      orderBy: [{ createdAt: "desc" }]
    });
  } catch {
    try {
      warnings = await prisma.warningRecord.findMany({
        where: { status: { not: "resolved" }, student: studentWhereForUser(user) },
        include: { student: { include: { classRoom: true } } },
        orderBy: [{ createdAt: "desc" }]
      });
    } catch {
      warnings = [];
    }
  }

  // 同时查询标记为重点关注但可能没有 WarningRecord 的学生（兼容旧数据）
  let focusStudents: any[] = [];
  const warningStudentIds = new Set(warnings.map((w: any) => w.studentId));
  try {
    focusStudents = await prisma.student.findMany({
      where: studentWhereForUser(user, { isFocus: true, status: "active" }),
      include: { classRoom: true },
      orderBy: [{ focusMarkedAt: "desc" }]
    });
    // 只保留没有 WarningRecord 的（避免重复显示）
    focusStudents = focusStudents.filter((s: any) => !warningStudentIds.has(s.id));
  } catch {
    focusStudents = [];
  }

  const hasData = warnings.length > 0 || focusStudents.length > 0;

  return (
    <DashboardLayout user={user}>
      <PageTitle
        title="重点关注"
        description={isHeadTeacher ? "当前仅显示你担任班主任班级里的重点关注学生和预警记录。" : "集中查看全校重点关注学生和风险预警记录。"}
      />

      {/* 预警记录表 */}
      {warnings.length > 0 && (
        <Panel title="风险预警">
          <TableShell>
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">学生</th>
                  <th className="px-4 py-3">班级</th>
                  <th className="px-4 py-3">预警等级</th>
                  <th className="px-4 py-3">预警类型</th>
                  <th className="px-4 py-3">原因</th>
                  <th className="px-4 py-3">负责人</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3">下次跟进</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {warnings.map((w) => (
                  <tr key={w.id}>
                    <td className="px-4 py-3 font-medium text-slate-950">
                      <span className="inline-flex items-center gap-2">
                        <Star size={15} className="text-amber-500" />
                        {w.student?.name || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {w.student?.classRoom ? `${w.student.classRoom.grade} ${w.student.classRoom.name}` : "未分班"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${levelColors[w.level] || "bg-slate-100 text-slate-700"}`}>
                        {levelLabels[w.level] || w.level}
                      </span>
                    </td>
                    <td className="px-4 py-3">{w.warningType}</td>
                    <td className="max-w-xs px-4 py-3">
                      <div className="line-clamp-2 whitespace-pre-wrap text-slate-700">{w.reason}</div>
                    </td>
                    <td className="px-4 py-3">{w.responsiblePerson || "-"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {warningStatusLabels[w.status] || w.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{displayDateTime(w.nextFollowUpAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <Link
                          href={`/students/${w.studentId}`}
                          className="inline-flex h-8 items-center gap-1 rounded border border-slate-200 px-3 text-slate-700 hover:bg-slate-50"
                        >
                          <Eye size={14} />
                          详情
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        </Panel>
      )}

      {/* 旧的关注学生列表（兼容） */}
      {focusStudents.length > 0 && (
        <div className={warnings.length > 0 ? "mt-6" : ""}>
          <Panel title="标记关注学生">
            <TableShell>
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                  <tr>
                    <th className="px-4 py-3">学生</th>
                    <th className="px-4 py-3">性别</th>
                    <th className="px-4 py-3">班级</th>
                    <th className="px-4 py-3">住宿</th>
                    <th className="px-4 py-3">家长电话</th>
                    <th className="px-4 py-3">学生情况</th>
                    <th className="px-4 py-3">标记信息</th>
                    <th className="px-4 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {focusStudents.map((student) => (
                    <tr key={student.id}>
                      <td className="px-4 py-3 font-medium text-slate-950">
                        <span className="inline-flex items-center gap-2">
                          <Star size={15} className="text-amber-500" />
                          {student.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">{genderLabels[student.gender]}</td>
                      <td className="px-4 py-3">
                        {student.classRoom ? `${student.classRoom.grade} ${student.classRoom.name}` : "未分班"}
                      </td>
                      <td className="px-4 py-3">{boardingLabels[student.boardingStatus]}</td>
                      <td className="px-4 py-3">{student.parentPhone}</td>
                      <td className="max-w-md px-4 py-3">
                        <div className="line-clamp-3 whitespace-pre-wrap text-slate-700">{student.focusNote}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {student.focusMarkedBy || "-"}
                        <div className="text-xs text-slate-500">{displayDateTime(student.focusMarkedAt)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <Link
                            href={`/students/${student.id}`}
                            className="inline-flex h-8 items-center gap-1 rounded border border-slate-200 px-3 text-slate-700 hover:bg-slate-50"
                          >
                            <Eye size={14} />
                            详情
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableShell>
          </Panel>
        </div>
      )}

      {!hasData && (
        <Panel title="重点关注列表">
          <EmptyText text="暂无重点关注学生" />
        </Panel>
      )}
    </DashboardLayout>
  );
}
