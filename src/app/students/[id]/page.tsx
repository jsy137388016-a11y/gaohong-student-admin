import Link from "next/link";
import { ArrowLeft, Edit3, ShieldAlert } from "lucide-react";
import { DisciplineForm } from "./DisciplineForm";
import { GuaranteeLetterForm } from "./GuaranteeLetterForm";
import { GuaranteeLetterItem } from "./GuaranteeLetterItem";
import { DeleteDisciplineButton } from "./DeleteDisciplineButton";
import { StudentTabs } from "./StudentTabs";
import { DashboardLayout } from "@/components/dashboard-layout";
import { EmptyText, PageTitle, Panel, TableShell } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  ALL_SUBJECTS,
  attendanceLabels,
  boardingLabels,
  displayDate,
  displayDateTime,
  displayValue,
  genderLabels,
  scoreTotalFromSubjects,
} from "@/lib/format";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

function InfoItem({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 font-medium text-slate-900">{displayValue(value)}</div>
    </div>
  );
}

export default async function StudentDetailPage({ params }: PageProps) {
  const user = await requireUser();
  const { id } = await params;
  const studentId = Number(id);

  let student: any = null;
  try {
    student = await prisma.student.findUnique({
      where: { id: Number.isInteger(studentId) ? studentId : -1 },
      include: { classRoom: true },
    });
  } catch {
    student = null;
  }

  // 学生不存在
  if (!student) {
    return (
      <DashboardLayout user={user}>
        <div className="flex flex-col items-center justify-center py-24">
          <div className="mb-4 text-6xl">📭</div>
          <h2 className="mb-2 text-xl font-semibold text-slate-900">学生不存在或已删除</h2>
          <p className="mb-8 text-sm text-slate-500">该学生记录不存在或已退学，请返回学生管理列表。</p>
          <Link
            href="/students"
            className="inline-flex h-10 items-center gap-2 rounded bg-brand-600 px-6 text-sm font-medium text-white hover:bg-brand-700"
          >
            <ArrowLeft size={16} />
            返回学生管理
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const statusLabel: Record<string, string> = {
    active: "在读",
    withdrawn: "已退学",
    inactive: "已停用",
    deleted: "已删除",
  };

  // ========== 成绩查询（两步：先查 Score，再查 Exam，避免 include 跨表问题）==========
  let examGroups: any[] = [];
  try {
    // 第一步：查该学生所有成绩
    const scores = await prisma.score.findMany({
      where: { studentId: student.id },
      orderBy: { subject: "asc" },
    });

    if (scores.length > 0) {
      // 第二步：根据 examId 去重，查 Exam 表
      const examIds = [...new Set(scores.map((s) => s.examId))];
      const exams = await prisma.exam.findMany({
        where: { id: { in: examIds } },
      });
      const examMap = new Map(exams.map((e) => [e.id, e]));

      // 第三步：代码层按 examId 分组
      const groupMap = new Map<number, any>();
      for (const s of scores) {
        if (!groupMap.has(s.examId)) {
          const exam = examMap.get(s.examId);
          groupMap.set(s.examId, {
            id: s.examId,
            name: exam?.name || `考试 #${s.examId}`,
            examDate: exam?.examDate || null,
            type: exam?.type || null,
            _scores: [],
          });
        }
        groupMap.get(s.examId)!._scores.push(s);
      }

      // 第四步：按考试日期倒序排列
      examGroups = Array.from(groupMap.values()).sort((a, b) => {
        const dateA = a.examDate ? new Date(a.examDate).getTime() : 0;
        const dateB = b.examDate ? new Date(b.examDate).getTime() : 0;
        return dateB - dateA;
      });
    }
  } catch {
    examGroups = [];
  }

  // 查询违纪记录
  let disciplines: any[] = [];
  try {
    disciplines = await prisma.discipline.findMany({
      where: { studentId: student.id },
      orderBy: { recordedAt: "desc" },
    });
  } catch {
    disciplines = [];
  }
  const MORAL_BASE = 20;
  const totalDeduct = disciplines.reduce(
    (sum: number, d: any) => sum + (d.deductScore || 0),
    0
  );
  const moralRemaining = Math.max(0, MORAL_BASE - totalDeduct);

  // 查询考勤记录
  let attendanceRecords: any[] = [];
  try {
    attendanceRecords = await prisma.attendance.findMany({
      where: { studentId: student.id },
      orderBy: { date: "desc" },
    });
  } catch {
    attendanceRecords = [];
  }

  // 查询保证书记录
  let letters: any[] = [];
  try {
    letters = await prisma.guaranteeLetter.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    letters = [];
  }

  return (
    <DashboardLayout user={user}>
      {/* 顶部操作栏 */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/students"
          className="inline-flex h-10 items-center gap-2 rounded border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft size={16} />
          返回学生管理
        </Link>
        <Link
          href={`/students/${student.id}/edit`}
          className="inline-flex h-10 items-center gap-2 rounded bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Edit3 size={16} />
          编辑学生
        </Link>
      </div>

      {/* 页面标题 */}
      <PageTitle
        title={student.name}
        description={
          student.classRoom
            ? `${student.classRoom.grade} ${student.classRoom.name} · ${
                genderLabels[student.gender] || student.gender
              } · ${statusLabel[student.status] || student.status}`
            : `${genderLabels[student.gender] || student.gender} · ${
                statusLabel[student.status] || student.status
              }`
        }
      />

      {/* Tabs 布局 */}
      <StudentTabs
        children={{
          info: (
            <div className="grid gap-4 lg:grid-cols-3">
              <Panel title="档案信息">
                <div className="grid gap-4 text-sm">
                  <InfoItem label="姓名" value={student.name} />
                  <InfoItem label="学号" value={student.studentNo} />
                  <InfoItem label="性别" value={genderLabels[student.gender] || student.gender} />
                  <InfoItem label="年级" value={student.grade} />
                </div>
              </Panel>
              <Panel title="班级与专业">
                <div className="grid gap-4 text-sm">
                  <InfoItem
                    label="班级"
                    value={student.classRoom ? `${student.classRoom.grade} ${student.classRoom.name}` : "未分班"}
                  />
                  <InfoItem label="当前状态" value={statusLabel[student.status] || student.status} />
                  <InfoItem label="住宿状态" value={boardingLabels[student.boardingStatus] || student.boardingStatus} />
                  <InfoItem label="艺考专业" value={student.artMajor} />
                </div>
              </Panel>
              <Panel title="联系方式">
                <div className="grid gap-4 text-sm">
                  <InfoItem label="手机号" value={student.phone} />
                  <InfoItem label="家长姓名" value={student.parentName} />
                  <InfoItem label="家长电话" value={student.parentPhone} />
                  <InfoItem label="备注" value={student.remark} />
                </div>
              </Panel>
            </div>
          ),
          scores: (
            <Panel title="考试成绩">
              {examGroups.length === 0 ? (
                <EmptyText />
              ) : (
                <div className="space-y-4">
                  {examGroups.map((exam) => {
                    const subjects = exam._scores;
                    const total = scoreTotalFromSubjects(subjects);
                    const filledCount = subjects.length;
                    const examTitle = exam.name || `考试 #${exam.id}`;
                    const examMeta: string[] = [];
                    if (exam.examDate) examMeta.push(displayDate(exam.examDate));
                    if (exam.type) examMeta.push(exam.type);

                    return (
                      <div key={exam.id} className="rounded border border-slate-200">
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
                          <div>
                            <div className="font-semibold text-slate-900">{examTitle}</div>
                            {examMeta.length > 0 && (
                              <div className="mt-0.5 text-xs text-slate-500">{examMeta.join(" · ")}</div>
                            )}
                            <div className="mt-0.5 text-xs text-slate-500">{filledCount} 个科目已录入</div>
                          </div>
                          {filledCount > 0 && (
                            <div className="text-right">
                              <div className="text-2xl font-bold text-brand-700">{total}</div>
                              <div className="text-xs text-slate-500">总分</div>
                            </div>
                          )}
                        </div>
                        {filledCount > 0 && (
                          <div className="flex flex-wrap gap-2 p-4">
                            {ALL_SUBJECTS.map((subj) => {
                              const item = subjects.find((s: any) => s.subject === subj);
                              if (!item) return null;
                              const ratio = item.fullScore > 0 ? item.score / item.fullScore : 0;
                              let color = "text-slate-900";
                              if (ratio >= 0.9) color = "text-green-700 font-semibold";
                              else if (ratio >= 0.7) color = "text-slate-900";
                              else if (ratio >= 0.6) color = "text-amber-700";
                              else color = "text-red-600 font-semibold";

                              return (
                                <div key={subj} className="flex items-center gap-1.5 rounded bg-slate-100 px-2.5 py-1.5 text-sm">
                                  <span className="text-slate-500">{subj}</span>
                                  <span className={color}>{item.score}</span>
                                  <span className="text-slate-400">/{item.fullScore}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>
          ),
          attendance: (
            <Panel title="考勤记录">
              {attendanceRecords.length === 0 ? (
                <EmptyText />
              ) : (
                <TableShell>
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">日期</th>
                        <th className="px-4 py-3">类型</th>
                        <th className="px-4 py-3">时间段</th>
                        <th className="px-4 py-3">说明</th>
                        <th className="px-4 py-3">记录人</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {attendanceRecords.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3">{displayDateTime(item.date)}</td>
                          <td className="px-4 py-3">{attendanceLabels[item.type] || displayValue(item.type)}</td>
                          <td className="px-4 py-3">{displayValue(item.period)}</td>
                          <td className="px-4 py-3">{displayValue(item.description)}</td>
                          <td className="px-4 py-3">{displayValue(item.recorder)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableShell>
              )}
            </Panel>
          ),
          disciplines: (
            <Panel title="违纪记录">
              <div className="mb-4">
                <DisciplineForm studentId={student.id} />
              </div>
              {/* 统计卡 */}
              <div className={`mb-4 rounded border p-4 ${
                moralRemaining <= 0
                  ? "border-red-200 bg-red-50"
                  : moralRemaining <= 15
                  ? "border-amber-200 bg-amber-50"
                  : "border-green-200 bg-green-50"
              }`}>
                <div className="mb-2 flex items-center gap-2">
                  <ShieldAlert size={16} className={
                    moralRemaining <= 0
                      ? "text-red-600"
                      : moralRemaining <= 15
                      ? "text-amber-600"
                      : "text-green-600"
                  } />
                  <span className="text-sm font-semibold">德育考核</span>
                  <span className={`ml-auto rounded px-2 py-0.5 text-xs font-bold ${
                    moralRemaining <= 0
                      ? "bg-red-100 text-red-700"
                      : moralRemaining <= 15
                      ? "bg-amber-100 text-amber-700"
                      : "bg-green-100 text-green-700"
                  }`}>
                    {moralRemaining <= 0 ? "重点关注" : moralRemaining <= 15 ? "提醒" : "正常"}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div><div className="text-2xl font-bold text-slate-900">{MORAL_BASE}</div><div className="text-xs text-slate-500">基础分</div></div>
                  <div><div className="text-2xl font-bold text-red-600">-{totalDeduct}</div><div className="text-xs text-slate-500">累计扣分</div></div>
                  <div><div className={`text-2xl font-bold ${moralRemaining <= 0 ? "text-red-600" : moralRemaining <= 15 ? "text-amber-600" : "text-green-600"}`}>{moralRemaining}</div><div className="text-xs text-slate-500">剩余分</div></div>
                  <div><div className="text-2xl font-bold text-slate-900">{disciplines.length}</div><div className="text-xs text-slate-500">违纪次数</div></div>
                </div>
              </div>

              {/* 违纪列表 */}
              {disciplines.length === 0 ? (
                <EmptyText />
              ) : (
                <div className="space-y-3">
                  {disciplines.map((d: any) => (
                    <div key={d.id} className="flex flex-col gap-1.5 rounded border border-slate-200 bg-white p-4 text-sm">
                      <div className="flex items-start justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">{d.violationType}</span>
                          {d.deductScore > 0 && <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">-{d.deductScore}分</span>}
                          {d.parentNotified ? (
                            <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">已通知家长</span>
                          ) : (
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">未通知家长</span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400">{displayDate(d.recordedAt)}</span>
                      </div>
                      {d.description && <div className="text-slate-700">{d.description}</div>}
                      {d.result && <div className="text-xs text-slate-500">处理：{d.result}</div>}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                        {d.follower && <span>跟进人：{d.follower}</span>}
                        {d.remark && <span>备注：{d.remark}</span>}
                      </div>
                      <div className="mt-2">
                        <DeleteDisciplineButton disciplineId={d.id} studentId={student.id} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          ),
          guarantees: (
            <Panel title="保证书留档">
              <div className="mb-4">
                <GuaranteeLetterForm studentId={student.id} />
              </div>
              {letters.length === 0 ? (
                <EmptyText />
              ) : (
                <div className="space-y-3">
                  {letters.map((l: any) => (
                    <GuaranteeLetterItem key={l.id} letter={l} studentId={student.id} />
                  ))}
                </div>
              )}
            </Panel>
          ),
        }}
      />
    </DashboardLayout>
  );
}
