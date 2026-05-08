import Link from "next/link";
import { Edit3, Eye } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { EmptyText, PageTitle, TableShell } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { displayValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess, studentWhereForUser, classWhereForUser, scopeTypeOf } from "@/lib/permissions";
import { deactivateClass } from "./actions";
import { ClassCreateModal } from "./ClassCreateModal";
import { DeactivateClassButton } from "./deactivate-button";

export default async function ClassesPage() {
  const user = await requireUser();
  requireModuleAccess(user, "classes");
  const isHeadTeacher = scopeTypeOf(user) === "class";
  let classRows: any[] = [];
  let unassignedCount = 0;
  try {
    [classRows, unassignedCount] = await Promise.all([
      prisma.classRoom.findMany({
        where: classWhereForUser(user, { status: "active" }),
        orderBy: [{ grade: "desc" }, { name: "asc" }]
      }),
      isHeadTeacher ? Promise.resolve(0) : prisma.student.count({ where: studentWhereForUser(user, { classId: null, status: "active" }) })
    ]);
  } catch {
    try {
      classRows = await prisma.classRoom.findMany({
        where: classWhereForUser(user),
        orderBy: [{ grade: "desc" }, { name: "asc" }]
      });
      classRows = classRows.filter((c: any) => c.status !== "inactive");
      unassignedCount = isHeadTeacher ? 0 : await prisma.student.count({ where: studentWhereForUser(user, { classId: null }) });
    } catch {
      classRows = [];
      unassignedCount = 0;
    }
  }
  let classes: any[] = [];
  try {
    classes = await Promise.all(
      classRows.map(async (item: any) => ({
        ...item,
        studentCount: await prisma.student.count({ where: studentWhereForUser(user, { classId: item.id, status: "active" }) })
      }))
    );
  } catch {
    classes = classRows.map((item: any) => ({ ...item, studentCount: 0 }));
  }

  return (
    <DashboardLayout user={user}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageTitle title="班级管理" description="创建班级，维护班主任、年级和备注。学生档案中可以绑定班级。" />
        {!isHeadTeacher ? <ClassCreateModal /> : null}
      </div>
      <div className="mb-6">
        {classes.length === 0 && unassignedCount === 0 ? (
          <EmptyText />
        ) : (
        <TableShell>
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-4 py-3">班级名称</th>
                <th className="px-4 py-3">年级</th>
                <th className="px-4 py-3">班主任</th>
                <th className="px-4 py-3">学生数</th>
                <th className="px-4 py-3">备注</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {classes.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium text-slate-950">{item.name}</td>
                  <td className="px-4 py-3">{item.grade}</td>
                  <td className="px-4 py-3">{item.headTeacher}</td>
                  <td className="px-4 py-3">{item.studentCount}</td>
                  <td className="px-4 py-3">{displayValue(item.remark)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        className="inline-flex h-8 items-center gap-1 rounded border border-slate-200 px-3 text-slate-700 hover:bg-slate-50"
                        href={`/classes/${item.id}`}
                        title="查看学生"
                      >
                        <Eye size={14} />
                        学生
                      </Link>
                      <Link
                        className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
                        href={`/classes/${item.id}/edit`}
                        title="编辑"
                      >
                        <Edit3 size={15} />
                      </Link>
                      <DeactivateClassButton
                        classId={item.id}
                        className={item.name}
                        studentCount={item.studentCount}
                        action={deactivateClass}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {!isHeadTeacher ? (
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-950">暂不分班</td>
                  <td className="px-4 py-3">—</td>
                  <td className="px-4 py-3">—</td>
                  <td className="px-4 py-3">{unassignedCount}</td>
                  <td className="px-4 py-3">尚未绑定班级的学生</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <Link
                        className="inline-flex h-8 items-center gap-1 rounded border border-slate-200 px-3 text-slate-700 hover:bg-slate-50"
                        href="/classes/unassigned"
                        title="查看暂不分班学生"
                      >
                        <Eye size={14} />
                        学生
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </TableShell>
        )}
      </div>
    </DashboardLayout>
  );
}
