import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { AddButton, DeleteButton, Field, inputClass, PageTitle, Panel, TableShell, textareaClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { displayDate, scoreTotalFromSubjects } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { createExam, deleteExam } from "./actions";

export default async function ExamsPage() {
  const user = await requireUser();
  let exams: any[] = [];
  try {
    exams = await prisma.exam.findMany({
      include: { scores: true },
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
      <PageTitle title="成绩管理" description="创建考试，录入各科成绩，查看总分和排名。" />
      <div className="mb-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <TableShell>
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
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
                // subject模式下，scores是扁平的成绩条目（每个学生每科一行）
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
                          <DeleteButton />
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableShell>
        <Panel title="新增考试">
          <form action={createExam} className="grid gap-4">
            <Field label="考试名称" required>
              <input name="name" required placeholder="三月月考" className={inputClass} />
            </Field>
            <Field label="考试日期" required>
              <input type="date" name="examDate" required className={inputClass} />
            </Field>
            <Field label="年级" required>
              <input name="grade" required placeholder="高三" className={inputClass} />
            </Field>
            <Field label="考试类型" required>
              <select name="type" required className={inputClass}>
                <option value="月考">月考</option>
                <option value="模拟考">模拟考</option>
                <option value="周测">周测</option>
                <option value="限时训练">限时训练</option>
                <option value="日常测验">日常测验</option>
              </select>
            </Field>
            <Field label="备注">
              <textarea name="remark" className={textareaClass} />
            </Field>
            <AddButton>新增考试</AddButton>
          </form>
        </Panel>
      </div>
    </DashboardLayout>
  );
}
