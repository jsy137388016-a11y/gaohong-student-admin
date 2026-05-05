import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, Edit3, MoveRight, Trash2, UserX } from "lucide-react";
import { ConfirmButton } from "@/components/ui";
import { DashboardLayout } from "@/components/dashboard-layout";
import { QuickActionButton } from "@/components/quick-actions";
import { EmptyText, PageTitle, Panel, TableShell } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { boardingLabels, genderLabels } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { deleteClassStudent, transferClassStudent, withdrawClassStudent } from "../actions";
import { ClassScoreImportButtons } from "./score-import-client";

type PageProps = {
  params: Promise<{ id: string }>;
};

function ClassNotFound({ user }: { user: { name: string; username: string; role: string } }) {
  return (
    <DashboardLayout user={user}>
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle size={48} className="mb-4 text-amber-500" />
        <h2 className="mb-2 text-xl font-semibold text-slate-900">班级不存在或已停用</h2>
        <p className="mb-6 text-sm text-slate-500">该班级可能已被停用或不存在，请返回班级管理查看。</p>
        <Link
          href="/classes"
          className="inline-flex h-10 items-center gap-2 rounded bg-brand-600 px-6 text-sm font-medium text-white hover:bg-brand-700"
        >
          <ArrowLeft size={16} />
          返回班级管理
        </Link>
      </div>
    </DashboardLayout>
  );
}

export default async function ClassDetailPage({ params }: PageProps) {
  const user = await requireUser();
  const { id } = await params;
  const isHeadTeacher = user.role === "head_teacher";
  const isUnassigned = id === "unassigned";

  // 班主任不能访问"暂不分班"
  if (isUnassigned && isHeadTeacher) notFound();

  // 验证 id 是否为有效整数（unassigned 除外）
  const classId = Number(id);
  if (!isUnassigned && !Number.isInteger(classId)) {
    return <ClassNotFound user={user} />;
  }

  // 查询班级信息，同时过滤已停用的班级
  let classRoom: any = null;
  if (!isUnassigned) {
    try {
      classRoom = await prisma.classRoom.findUnique({
        where: { id: classId, status: "active" }
      });
    } catch {
      // D1 查询异常（如字段不存在）时，降级为不过滤 status 再试
      try {
        classRoom = await prisma.classRoom.findUnique({ where: { id: classId } });
        if (classRoom && classRoom.status === "inactive") classRoom = null;
      } catch {
        return <ClassNotFound user={user} />;
      }
    }
  }

  // 班级不存在或已停用
  if (!isUnassigned && !classRoom) {
    return <ClassNotFound user={user} />;
  }

  // 班主任权限检查：只能查看自己负责的班级
  if (isHeadTeacher && classRoom?.headTeacher !== user.name) {
    return <ClassNotFound user={user} />;
  }

  // 查询学生和班级列表
  let students: any[] = [];
  let classes: any[] = [];
  try {
    [students, classes] = await Promise.all([
      prisma.student.findMany({
        where: isUnassigned ? { classId: null, status: "active" } : { classId: classRoom!.id, status: "active" },
        orderBy: { name: "asc" }
      }),
      prisma.classRoom.findMany({
        where: {
          status: "active",
          ...(isHeadTeacher ? { headTeacher: user.name } : {})
        },
        orderBy: [{ grade: "desc" }, { name: "asc" }]
      })
    ]);
  } catch {
    // 查询异常时，尝试降级查询（不过滤 status）
    try {
      [students, classes] = await Promise.all([
        prisma.student.findMany({
          where: isUnassigned ? { classId: null } : { classId: classRoom!.id },
          orderBy: { name: "asc" }
        }),
        prisma.classRoom.findMany({
          where: isHeadTeacher ? { headTeacher: user.name } : {},
          orderBy: [{ grade: "desc" }, { name: "asc" }]
        })
      ]);
      // 过滤已停用班级
      classes = classes.filter((c: any) => c.status !== "inactive");
      students = students.filter((s: any) => s.status !== "withdrawn" && s.status !== "inactive" && s.status !== "deleted");
    } catch {
      // 完全失败时返回空数据
      students = [];
      classes = [];
    }
  }

  const targetClasses = classes.filter((item: any) => isUnassigned || item.id !== classRoom?.id);
  const currentClassId = isUnassigned ? "unassigned" : String(classRoom!.id);
  const canMoveToUnassigned = !isHeadTeacher;
  const canTransferStudent = canMoveToUnassigned || targetClasses.length > 0;

  return (
    <DashboardLayout user={user}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <PageTitle
          title={isUnassigned ? "暂不分班学生" : `${classRoom!.name} 学生`}
          description={isUnassigned ? "查看尚未绑定班级的学生，可在本页直接换班。" : "查看该班级下所有已绑定学生。"}
        />
        <div className="flex flex-wrap gap-2">
          <Link
            href="/classes"
            className="inline-flex h-10 items-center gap-2 rounded border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            返回班级
          </Link>
          {!isUnassigned ? (
            <>
              <Link
                href={`/classes/${classRoom!.id}/edit`}
                className="inline-flex h-10 items-center gap-2 rounded border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Edit3 size={16} />
                编辑班级
              </Link>
              <ClassScoreImportButtons
                classId={classRoom!.id}
                className={classRoom!.name}
                grade={classRoom!.grade}
              />
            </>
          ) : null}
        </div>
      </div>

      <Panel title="班级信息">
        <div className="grid gap-4 text-sm md:grid-cols-4">
          <Info label="班级名称" value={isUnassigned ? "暂不分班" : classRoom!.name} />
          <Info label="班主任" value={isUnassigned ? "-" : classRoom!.headTeacher} />
          <Info label="年级" value={isUnassigned ? "-" : classRoom!.grade} />
          <Info label="学生总数" value={students.length} />
        </div>
      </Panel>

      <div className="mt-6">
        <Panel title="学生列表">
          {students.length === 0 ? (
            <EmptyText text={isUnassigned ? "暂无暂不分班学生" : "该班级暂无学生"} />
          ) : (
            <TableShell>
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">姓名</th>
                    <th className="px-4 py-3">性别</th>
                    <th className="px-4 py-3">年级</th>
                    <th className="px-4 py-3">手机号</th>
                    <th className="px-4 py-3">家长姓名</th>
                    <th className="px-4 py-3">家长电话</th>
                    <th className="px-4 py-3">住宿状态</th>
                    <th className="px-4 py-3">艺考专业</th>
                    <th className="px-4 py-3">备注</th>
                    <th className="px-4 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {students.map((student: any) => (
                    <tr key={student.id}>
                      <td className="px-4 py-3 font-medium text-slate-950">
                        <Link href={`/students/${student.id}`} className="hover:text-brand-700 hover:underline">
                          {student.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{genderLabels[student.gender]}</td>
                      <td className="px-4 py-3">{student.grade}</td>
                      <td className="px-4 py-3">{student.phone || "-"}</td>
                      <td className="px-4 py-3">{student.parentName}</td>
                      <td className="px-4 py-3">{student.parentPhone}</td>
                      <td className="px-4 py-3">{boardingLabels[student.boardingStatus]}</td>
                      <td className="px-4 py-3">{student.artMajor || "-"}</td>
                      <td className="px-4 py-3">{student.remark || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex min-w-[400px] items-center justify-end gap-2">
                          <QuickActionButton
                            student={{
                              id: student.id,
                              name: student.name,
                              grade: student.grade,
                              classRoom: isUnassigned ? null : { id: classRoom!.id, name: classRoom!.name, grade: classRoom!.grade }
                            }}
                            userName={user.name}
                            className={isUnassigned ? "暂不分班" : `${classRoom!.grade} ${classRoom!.name}`}
                            grade={isUnassigned ? "" : classRoom!.grade}
                          />
                          {canTransferStudent ? (
                            <form action={transferClassStudent.bind(null, student.id, currentClassId)} className="flex gap-2">
                              <select name="targetClassId" defaultValue="" required className="h-8 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700">
                                <option value="" disabled>
                                  选择班级
                                </option>
                                {canMoveToUnassigned ? <option value="unassigned">暂不分班</option> : null}
                                {targetClasses.map((item: any) => (
                                  <option key={item.id} value={item.id}>
                                    {item.grade} {item.name}
                                  </option>
                                ))}
                              </select>
                              <button className="inline-flex h-8 items-center gap-1 rounded border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50" title="换班">
                                <MoveRight size={14} />
                                换班
                              </button>
                            </form>
                          ) : (
                            <span className="inline-flex h-8 items-center rounded border border-slate-200 px-3 text-xs text-slate-400">暂无可换班级</span>
                          )}
                          <form action={withdrawClassStudent.bind(null, student.id, currentClassId)}>
                            <ConfirmButton
                              label="退学"
                              variant="warning"
                              confirmText={`确认将该学生标记为退学吗？退学后学生不会出现在当前班级名单中，但历史成绩、违纪、沟通记录会保留。`}
                            />
                          </form>
                          <form action={deleteClassStudent.bind(null, student.id, currentClassId)}>
                            <ConfirmButton
                              label="删除"
                              confirmText="确认删除该学生吗？系统将改为软删除，不会物理删除历史数据。"
                            />
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableShell>
          )}
        </Panel>
      </div>
    </DashboardLayout>
  );
}

function Info({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 font-medium text-slate-900">{value}</div>
    </div>
  );
}
