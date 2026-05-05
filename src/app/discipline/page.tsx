import { StudentSearchSelect } from "@/components/StudentSearchSelect";
import { DashboardLayout } from "@/components/dashboard-layout";
import { inputClass, PageTitle, Panel, SearchButton, TableShell } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { displayDateTime, firstValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { DeleteDisciplineRowButton } from "./DeleteDisciplineRowButton";
import { DisciplineCreateForm } from "./DisciplineCreateForm";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DisciplinePage({ searchParams }: PageProps) {
  const user = await requireUser();
  const params = (await searchParams) || {};
  const studentId = firstValue(params.studentId) || "";

  let students: any[] = [];
  let records: any[] = [];
  try {
    students = await prisma.student.findMany({ where: { status: "active" }, include: { classRoom: true }, orderBy: { name: "asc" } });
    records = await prisma.discipline.findMany({
      where: studentId ? { studentId: Number(studentId) } : {},
      include: { student: { include: { classRoom: true } } },
      orderBy: { recordedAt: "desc" }
    });
  } catch {
    try {
      [students, records] = await Promise.all([
        prisma.student.findMany({ include: { classRoom: true }, orderBy: { name: "asc" } }),
        prisma.discipline.findMany({
          where: studentId ? { studentId: Number(studentId) } : {},
          include: { student: { include: { classRoom: true } } },
          orderBy: { recordedAt: "desc" }
        })
      ]);
      students = students.filter((s: any) => s.status !== "withdrawn" && s.status !== "inactive" && s.status !== "deleted");
    } catch {
      students = [];
      records = [];
    }
  }

  return (
    <DashboardLayout user={user}>
      <PageTitle title="纪律管理" description="记录违纪类型、处理结果、是否通知家长，并可查看学生历史记录。" />

      {/* 查询筛选区域 */}
      <div className="mb-6 grid gap-6">
        <Panel title="查询筛选">
          <form className="grid gap-4 md:grid-cols-[260px_auto_auto]" action="/discipline">
            <StudentSearchSelect students={students} name="studentId" placeholder="搜索学生姓名/手机号/班级" />
            <SearchButton />
            <DisciplineCreateForm students={students} userName={user.name} />
          </form>
        </Panel>
      </div>

      <TableShell>
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">学生</th>
              <th className="px-4 py-3">班级</th>
              <th className="px-4 py-3">类型</th>
              <th className="px-4 py-3">描述</th>
              <th className="px-4 py-3">处理结果</th>
              <th className="px-4 py-3">扣分</th>
              <th className="px-4 py-3">家长通知</th>
              <th className="px-4 py-3">跟进人</th>
              <th className="px-4 py-3">时间</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {records.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 font-medium">{item.student.name}</td>
                <td className="px-4 py-3">{item.student.classRoom?.name || "未分班"}</td>
                <td className="px-4 py-3">{item.violationType}</td>
                <td className="px-4 py-3">{item.description}</td>
                <td className="px-4 py-3">{item.result}</td>
                <td className="px-4 py-3 font-semibold text-red-600">{item.deductScore || 0}</td>
                <td className="px-4 py-3">{item.parentNotified ? "已通知" : "未通知"}</td>
                <td className="px-4 py-3">{item.follower}</td>
                <td className="px-4 py-3">{displayDateTime(item.recordedAt)}</td>
                <td className="px-4 py-3 text-right">
                  <DeleteDisciplineRowButton id={item.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </DashboardLayout>
  );
}
