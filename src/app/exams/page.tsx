import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { DeleteButton, PageTitle, TableShell } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { displayDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess, studentWhereForUser } from "@/lib/permissions";
import { deleteExam } from "./actions";
import { ExamCreateModal } from "./ExamCreateModal";

export default async function ExamsPage() {
  const user = await requireUser();
  requireModuleAccess(user, "exams");
  let exams: any[] = [];
  try {
    exams = await prisma.exam.findMany({
      include: { scores: { where: { student: studentWhereForUser(user) } } },
      orderBy: { examDate: "desc" }
    });
  } catch {
    try {
      exams = await prisma.exam.findMany({ orderBy: { examDate: "desc" } });
      exams = exams.map((e: any) => ({ ...e, scores: [] }));
    } catch {
      exams = [];
    }
  }

  return (
    <DashboardLayout user={user}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageTitle title="成绩管理" description="创建考试，录入各科成绩，查看总分和排名。" />
        <ExamCreateModal />
      </div>
      <div className="mb-6">
        <TableShell>
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-4 py-3">考试</th>
                <th className="px-4 py-3">日期</th>
                <th className="px-4 py-3">年级</th>
                <th className="px-4 py-3">类型</th>
                <th className="px-4 py-3">成绩条数</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {exams.map((exam) => {
                const scoreCount = exam.scores?.length || 0;
                const studentIds = new Set((exam.scores || []).map((s: any) => s.studentId));
                const studentCount = studentIds.size;
                return (
                  <tr key={exam.id}>
                    <td className="px-4 py-3 font-medium text-slate-950">{exam.name}</td>
                    <td className="px-4 py-3">{displayDate(exam.examDate)}</td>
                    <td className="px-4 py-3">{exam.grade}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{exam.type || "月考"}</span>
                    </td>
                    <td className="px-4 py-3">{studentCount} 人 / {scoreCount} 条</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link href={`/exams/${exam.id}`} className="inline-flex h-8 items-center gap-1 rounded border border-slate-200 px-3 text-slate-700 hover:bg-slate-50">
                          查看 <ArrowRight size={14} />
                        </Link>
                        <form action={deleteExam.bind(null, exam.id)}>
                          <DeleteButton confirmText="确认删除该考试吗？该考试下的成绩记录也会一起删除。" />
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableShell>
      </div>
    </DashboardLayout>
  );
}
