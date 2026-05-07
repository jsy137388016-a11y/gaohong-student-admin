import { StudentSearchSelect } from "@/components/StudentSearchSelect";
import { DashboardLayout } from "@/components/dashboard-layout";
import { EmptyText, FilterBar, inputClass, MoreActions, PageTitle, Panel, SearchButton, TableShell } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { displayDateTime, displayValue, firstValue } from "@/lib/format";
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
  const classId = firstValue(params.classId) || "";
  const date = firstValue(params.date) || "";

  let classes: any[] = [];
  let students: any[] = [];
  let records: any[] = [];
  try {
    [classes, students] = await Promise.all([
      prisma.classRoom.findMany({ where: { status: "active" }, orderBy: [{ grade: "desc" }, { name: "asc" }] }),
      prisma.student.findMany({ where: { status: "active" }, include: { classRoom: true }, orderBy: { name: "asc" } })
    ]);
    records = await prisma.discipline.findMany({
      where: {
        AND: [
          studentId ? { studentId: Number(studentId) } : {},
          classId ? { student: { classId: Number(classId) } } : {},
          date
            ? {
                recordedAt: {
                  gte: new Date(`${date}T00:00:00`),
                  lt: new Date(`${date}T23:59:59`)
                }
              }
            : {}
        ]
      },
      include: { student: { include: { classRoom: true } } },
      orderBy: { recordedAt: "desc" }
    });
  } catch {
    try {
      [classes, students, records] = await Promise.all([
        prisma.classRoom.findMany({ orderBy: [{ grade: "desc" }, { name: "asc" }] }),
        prisma.student.findMany({ include: { classRoom: true }, orderBy: { name: "asc" } }),
        prisma.discipline.findMany({
          where: studentId ? { studentId: Number(studentId) } : {},
          include: { student: { include: { classRoom: true } } },
          orderBy: { recordedAt: "desc" }
        })
      ]);
      classes = classes.filter((c: any) => c.status !== "inactive");
      students = students.filter((s: any) => s.status !== "withdrawn" && s.status !== "inactive" && s.status !== "deleted");
      records = records.filter((record: any) => {
        if (classId && record.student?.classId !== Number(classId)) return false;
        if (date) {
          const recordedDate = new Date(record.recordedAt).toISOString().slice(0, 10);
          if (recordedDate !== date) return false;
        }
        return true;
      });
    } catch {
      classes = [];
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
          <FilterBar>
          <div className="grid gap-3 md:grid-cols-[260px_220px_180px_auto_auto] md:items-center">
            <form className="contents" action="/discipline">
              <StudentSearchSelect students={students} name="studentId" placeholder="搜索学生姓名/手机号/班级" />
              <select name="classId" defaultValue={classId} className={inputClass}>
                <option value="">全部班级</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>{item.grade} {item.name}</option>
                ))}
              </select>
              <input type="date" name="date" defaultValue={date} className={inputClass} />
              <SearchButton />
            </form>
            <DisciplineCreateForm students={students} userName={user.name} />
          </div>
          </FilterBar>
        </Panel>
      </div>

      {records.length === 0 ? (
        <EmptyText />
      ) : (
        <TableShell>
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-5 py-3">学生</th>
                <th className="px-5 py-3">班级</th>
                <th className="px-5 py-3">类型</th>
                <th className="px-5 py-3">描述</th>
                <th className="px-5 py-3">处理结果</th>
                <th className="px-5 py-3">扣分</th>
                <th className="px-5 py-3">家长通知</th>
                <th className="px-5 py-3">跟进人</th>
                <th className="px-5 py-3">时间</th>
                <th className="px-5 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {records.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-3 font-medium">{displayValue(item.student.name)}</td>
                  <td className="px-5 py-3">{item.student.classRoom?.name || "未分班"}</td>
                  <td className="px-5 py-3">{displayValue(item.violationType)}</td>
                  <td className="px-5 py-3">{displayValue(item.description)}</td>
                  <td className="px-5 py-3">{displayValue(item.result)}</td>
                  <td className="px-5 py-3 font-semibold text-red-600">{item.deductScore || 0}</td>
                  <td className="px-5 py-3">{item.parentNotified ? "已通知" : "未通知"}</td>
                  <td className="px-5 py-3">{displayValue(item.follower)}</td>
                  <td className="px-5 py-3">{displayDateTime(item.recordedAt)}</td>
                  <td className="px-5 py-3 text-right">
                    <MoreActions>
                      <DeleteDisciplineRowButton id={item.id} variant="menu" />
                    </MoreActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      )}
    </DashboardLayout>
  );
}
