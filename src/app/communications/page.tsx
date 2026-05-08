import { DashboardLayout } from "@/components/dashboard-layout";
import { ConfirmButton, EmptyText, FilterBar, inputClass, MoreActions, PageTitle, Panel, SearchButton, TableShell } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { displayDateTime, displayValue, firstValue, methodLabels } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess, studentWhereForUser } from "@/lib/permissions";
import { deleteCommunication } from "./actions";
import { CommunicationCreateModal } from "./CommunicationCreateModal";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CommunicationsPage({ searchParams }: PageProps) {
  const user = await requireUser();
  requireModuleAccess(user, "communications");
  const params = (await searchParams) || {};
  const studentId = firstValue(params.studentId) || "";

  let students: any[] = [];
  let records: any[] = [];
  try {
    students = await prisma.student.findMany({ where: studentWhereForUser(user, { status: "active" }), include: { classRoom: true }, orderBy: { name: "asc" } });
    records = await prisma.communication.findMany({
      where: studentId ? { student: studentWhereForUser(user, { id: Number(studentId) }) } : { student: studentWhereForUser(user) },
      include: { student: { include: { classRoom: true } } },
      orderBy: { contactedAt: "desc" }
    });
  } catch {
    try {
      [students, records] = await Promise.all([
        prisma.student.findMany({ where: studentWhereForUser(user), include: { classRoom: true }, orderBy: { name: "asc" } }),
        prisma.communication.findMany({
          where: studentId ? { student: studentWhereForUser(user, { id: Number(studentId) }) } : { student: studentWhereForUser(user) },
          include: { student: { include: { classRoom: true } } },
          orderBy: { contactedAt: "desc" }
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
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageTitle title="家校沟通" description="记录与家长的沟通对象、方式、内容和后续跟进事项。" />
        <CommunicationCreateModal students={students} userName={user.name} />
      </div>
      <div className="mb-6 grid gap-6">
        <Panel title="查看学生沟通记录">
          <FilterBar>
          <form className="grid gap-3 md:grid-cols-[260px_auto] md:items-center" action="/communications">
            <select name="studentId" defaultValue={studentId} className={inputClass}>
              <option value="">全部学生</option>
              {students.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <SearchButton />
          </form>
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
                <th className="px-5 py-3">对象</th>
                <th className="px-5 py-3">方式</th>
                <th className="px-5 py-3">内容</th>
                <th className="px-5 py-3">后续跟进</th>
                <th className="px-5 py-3">沟通人</th>
                <th className="px-5 py-3">时间</th>
                <th className="px-5 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {records.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-3 font-medium">{displayValue(item.student.name)}</td>
                  <td className="px-5 py-3">{item.student.classRoom?.name || "未分班"}</td>
                  <td className="px-5 py-3">{displayValue(item.target)}</td>
                  <td className="px-5 py-3">{methodLabels[item.method] || displayValue(item.method)}</td>
                  <td className="px-5 py-3">{displayValue(item.content)}</td>
                  <td className="px-5 py-3">{displayValue(item.followUp)}</td>
                  <td className="px-5 py-3">{displayValue(item.communicator)}</td>
                  <td className="px-5 py-3">{displayDateTime(item.contactedAt)}</td>
                  <td className="px-5 py-3 text-right">
                    <MoreActions>
                      <form action={deleteCommunication.bind(null, item.id)}>
                        <ConfirmButton label="删除" confirmText="确认删除该沟通记录吗？" />
                      </form>
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
