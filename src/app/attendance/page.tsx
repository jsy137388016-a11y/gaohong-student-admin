import { StudentSearchSelect } from "@/components/StudentSearchSelect";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ConfirmButton, EmptyText, inputClass, PageTitle, Panel, SearchButton, TableShell } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { attendanceLabels, displayDate, displayValue, firstValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { deleteAttendance } from "./actions";
import { AttendanceCreateModal } from "./AttendanceCreateModal";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AttendancePage({ searchParams }: PageProps) {
  const user = await requireUser();
  const params = (await searchParams) || {};
  const date = firstValue(params.date) || "";
  const classId = firstValue(params.classId) || "";
  const studentId = firstValue(params.studentId) || "";

  let classes: any[] = [];
  let students: any[] = [];
  let attendance: any[] = [];
  try {
    [classes, students] = await Promise.all([
      prisma.classRoom.findMany({ orderBy: [{ grade: "desc" }, { name: "asc" }] }),
      prisma.student.findMany({ where: { status: "active" }, include: { classRoom: true }, orderBy: { name: "asc" } })
    ]);
    attendance = await prisma.attendance.findMany({
      where: {
        AND: [
          date
            ? {
                date: {
                  gte: new Date(`${date}T00:00:00`),
                  lt: new Date(`${date}T23:59:59`)
                }
              }
            : {},
          classId ? { student: { classId: Number(classId) } } : {},
          studentId ? { studentId: Number(studentId) } : {}
        ]
      },
      include: { student: { include: { classRoom: true } } },
      orderBy: { date: "desc" }
    });
  } catch {
    try {
      [classes, students, attendance] = await Promise.all([
        prisma.classRoom.findMany({ orderBy: [{ grade: "desc" }, { name: "asc" }] }),
        prisma.student.findMany({ include: { classRoom: true }, orderBy: { name: "asc" } }),
        prisma.attendance.findMany({
          where: studentId ? { studentId: Number(studentId) } : {},
          include: { student: { include: { classRoom: true } } },
          orderBy: { date: "desc" }
        })
      ]);
      students = students.filter((s: any) => s.status !== "withdrawn" && s.status !== "inactive" && s.status !== "deleted");
    } catch {
      classes = [];
      students = [];
      attendance = [];
    }
  }

  return (
    <DashboardLayout user={user}>
      <PageTitle title="考勤管理" description="记录正常、迟到、请假、旷课、早退、未归寝，并支持多条件筛选。" />

      {/* 查询筛选区域 */}
      <div className="mb-6 grid gap-6">
        <Panel title="查询筛选">
          <form className="grid gap-4 md:grid-cols-[180px_220px_220px_auto_auto]" action="/attendance">
            <input type="date" name="date" defaultValue={date} className={inputClass} />
            <select name="classId" defaultValue={classId} className={inputClass}>
              <option value="">全部班级</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>{item.grade} {item.name}</option>
              ))}
            </select>
            <StudentSearchSelect students={students} name="studentId" placeholder="搜索学生姓名/手机号/班级" />
            <SearchButton />
            <AttendanceCreateModal students={students} userName={user.name} />
          </form>
        </Panel>
      </div>

      {attendance.length === 0 ? (
        <EmptyText />
      ) : (
        <TableShell>
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">日期</th>
                <th className="px-4 py-3">学生</th>
                <th className="px-4 py-3">班级</th>
                <th className="px-4 py-3">类型</th>
                <th className="px-4 py-3">时间段</th>
                <th className="px-4 py-3">说明</th>
                <th className="px-4 py-3">记录人</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {attendance.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">{displayDate(item.date)}</td>
                  <td className="px-4 py-3 font-medium">{displayValue(item.student.name)}</td>
                  <td className="px-4 py-3">{item.student.classRoom?.name || "未分班"}</td>
                  <td className="px-4 py-3">{attendanceLabels[item.type] || displayValue(item.type)}</td>
                  <td className="px-4 py-3">{displayValue(item.period)}</td>
                  <td className="px-4 py-3">{displayValue(item.description)}</td>
                  <td className="px-4 py-3">{displayValue(item.recorder)}</td>
                  <td className="px-4 py-3">
                    <form action={deleteAttendance.bind(null, item.id)} className="flex justify-end">
                      <ConfirmButton
                        label="删除"
                        confirmText="确认删除该考勤记录吗？"
                      />
                    </form>
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
