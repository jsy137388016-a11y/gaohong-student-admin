import Link from "next/link";
import { AlertTriangle, ArrowLeft, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { DeleteButton, Field, inputClass, PageTitle, Panel, TableShell } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { displayDate, firstValue, scoreTotalFromSubjects, ALL_SUBJECTS, SUBJECT_FULL_SCORES } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { deleteScore } from "../actions";
import { ScoreImportPanel } from "@/components/score-import";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function ExamNotFound({ user }: { user: { name: string; username: string; role: string } }) {
  return (
    <DashboardLayout user={user}>
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle size={48} className="mb-4 text-amber-500" />
        <h2 className="mb-2 text-xl font-semibold text-slate-900">考试不存在</h2>
        <p className="mb-6 text-sm text-slate-500">该考试记录可能已被删除或不存在，请返回成绩管理查看。</p>
        <Link
          href="/exams"
          className="inline-flex h-10 items-center gap-2 rounded bg-brand-600 px-6 text-sm font-medium text-white hover:bg-brand-700"
        >
          <ArrowLeft size={16} />
          返回成绩管理
        </Link>
      </div>
    </DashboardLayout>
  );
}

export default async function ExamDetailPage({ params, searchParams }: PageProps) {
  const user = await requireUser();
  const { id } = await params;
  const query = (await searchParams) || {};
  const classId = firstValue(query.classId) || "";
  const examId = Number(id);

  if (!Number.isInteger(examId)) {
    return <ExamNotFound user={user} />;
  }

  let exam: any = null;
  try {
    exam = await prisma.exam.findUnique({ where: { id: examId } });
  } catch {
    return <ExamNotFound user={user} />;
  }
  if (!exam) return <ExamNotFound user={user} />;

  let classes: any[] = [];
  let scores: any[] = [];
  try {
    [classes, scores] = await Promise.all([
      prisma.classRoom.findMany({ orderBy: [{ grade: "desc" }, { name: "asc" }] }),
      prisma.score.findMany({
        where: { examId, ...(classId ? { classId: Number(classId) } : {}) },
        include: { student: { include: { classRoom: true } } }
      })
    ]);
  } catch {
    try {
      [classes, scores] = await Promise.all([
        prisma.classRoom.findMany({ orderBy: [{ grade: "desc" }, { name: "asc" }] }),
        prisma.score.findMany({
          where: { examId },
          include: { student: { include: { classRoom: true } } }
        })
      ]);
    } catch {
      classes = [];
      scores = [];
    }
  }

  // 将扁平的scores按studentId分组
  const studentMap = new Map<number, { student: any; scores: any[] }>();
  for (const s of scores) {
    const sid = s.studentId;
    if (!studentMap.has(sid)) {
      studentMap.set(sid, { student: s.student, scores: [] });
    }
    studentMap.get(sid)!.scores.push(s);
  }

  // 计算总分并排名
  const ranked = Array.from(studentMap.entries())
    .map(([studentId, data]) => {
      const total = scoreTotalFromSubjects(data.scores);
      return { studentId, student: data.student, scores: data.scores, total };
    })
    .sort((a, b) => b.total - a.total)
    .map((item, index) => ({ ...item, rank: index + 1 }));

  // 检查这次考试有哪些科目
  const examSubjects = new Set<string>();
  for (const s of scores) {
    examSubjects.add(s.subject);
  }
  // 按ALL_SUBJECTS顺序排列
  const displaySubjects = ALL_SUBJECTS.filter((s) => examSubjects.has(s));

  return (
    <DashboardLayout user={user}>
      <PageTitle title={exam.name} description={`${exam.grade} · ${displayDate(exam.examDate)} · 查看各科成绩、总分、排名。`} />

      {/* Excel 批量导入 */}
      <div className="mb-6">
        <ScoreImportPanel examId={exam.id} examName={exam.name} examGrade={exam.grade} />
      </div>

      <div className="mb-6">
        <Panel title="班级筛选">
          <form action={`/exams/${exam.id}`} className="grid gap-4 md:grid-cols-[260px_auto]">
            <select name="classId" defaultValue={classId} className={inputClass}>
              <option value="">全部班级</option>
              {classes.map((item: any) => (
                <option key={item.id} value={item.id}>{item.grade} {item.name}</option>
              ))}
            </select>
            <button className="h-10 rounded border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">查看排名</button>
          </form>
        </Panel>
      </div>

      <TableShell>
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">排名</th>
              <th className="px-4 py-3">学生</th>
              <th className="px-4 py-3">班级</th>
              {displaySubjects.map((subj) => (
                <th key={subj} className="px-4 py-3">{subj}</th>
              ))}
              <th className="px-4 py-3">总分</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {ranked.map((item) => {
              // 构建科目→分数映射
              const subjectScoreMap = new Map<string, number>();
              for (const s of item.scores) {
                subjectScoreMap.set(s.subject, s.score);
              }
              return (
                <tr key={item.studentId}>
                  <td className="px-4 py-3 font-semibold">{item.rank}</td>
                  <td className="px-4 py-3 font-medium">{item.student?.name || "-"}</td>
                  <td className="px-4 py-3">{item.student?.classRoom?.name || "未分班"}</td>
                  {displaySubjects.map((subj) => (
                    <td key={subj} className="px-4 py-3">
                      {subjectScoreMap.has(subj) ? subjectScoreMap.get(subj) : "-"}
                    </td>
                  ))}
                  <td className="px-4 py-3 font-semibold">{item.total}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {item.scores.map((s: any) => (
                        <form key={s.id} action={deleteScore.bind(null, s.id, exam.id)} className="inline">
                          <button
                            type="submit"
                            className="inline-flex h-6 items-center rounded border border-red-200 px-1.5 text-xs text-red-600 hover:bg-red-50"
                            title={`删除${s.subject}成绩`}
                          >
                            <Trash2 size={10} />
                          </button>
                        </form>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableShell>
    </DashboardLayout>
  );
}
