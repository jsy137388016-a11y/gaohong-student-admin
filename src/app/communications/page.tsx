import { Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { AddButton, dangerMenuItemClass, EmptyText, Field, FilterBar, inputClass, MoreActions, PageTitle, Panel, SearchButton, TableShell, textareaClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { displayDateTime, displayValue, firstValue, methodLabels } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { createCommunication, deleteCommunication } from "./actions";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CommunicationsPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const params = (await searchParams) || {};
  const studentId = firstValue(params.studentId) || "";

  let students: any[] = [];
  let records: any[] = [];
  try {
    students = await prisma.student.findMany({ where: { status: "active" }, include: { classRoom: true }, orderBy: { name: "asc" } });
    records = await prisma.communication.findMany({
      where: studentId ? { studentId: Number(studentId) } : {},
      include: { student: { include: { classRoom: true } } },
      orderBy: { contactedAt: "desc" }
    });
  } catch {
    try {
      [students, records] = await Promise.all([
        prisma.student.findMany({ include: { classRoom: true }, orderBy: { name: "asc" } }),
        prisma.communication.findMany({
          where: studentId ? { studentId: Number(studentId) } : {},
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
      <PageTitle title="家校沟通" description="记录与家长的沟通对象、方式、内容和后续跟进事项。" />
      <div className="mb-6 grid gap-6 xl:grid-cols-[1fr_380px]">
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
        <Panel title="新增沟通记录">
          <form action={createCommunication} className="grid gap-4">
            <Field label="学生" required>
              <select name="studentId" required className={inputClass}>
                {students.map((item) => (
                  <option key={item.id} value={item.id}>{item.name} {item.classRoom ? `(${item.classRoom.name})` : ""}</option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="沟通对象" required>
                <input name="target" required placeholder="父亲/母亲" className={inputClass} />
              </Field>
              <Field label="沟通方式" required>
                <select name="method" required className={inputClass}>
                  {Object.entries(methodLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="沟通内容" required>
              <textarea name="content" required className={textareaClass} />
            </Field>
            <Field label="家长反馈">
              <textarea name="parentFeedback" placeholder="家长的主要反馈" className={textareaClass} />
            </Field>
            <Field label="后续跟进事项">
              <textarea name="followUp" placeholder="需要班主任继续跟进的事项" className={textareaClass} />
            </Field>
            <Field label="沟通人" required>
              <input name="communicator" required defaultValue={user.name} className={inputClass} />
            </Field>
            <Field label="沟通时间" required>
              <input type="datetime-local" name="contactedAt" required defaultValue={new Date().toISOString().slice(0, 16)} className={inputClass} />
            </Field>
            <AddButton>新增沟通</AddButton>
          </form>
        </Panel>
      </div>

      {records.length === 0 ? (
        <EmptyText />
      ) : (
        <TableShell>
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
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
                        <button className={dangerMenuItemClass}>
                          <Trash2 size={14} />
                          删除
                        </button>
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
