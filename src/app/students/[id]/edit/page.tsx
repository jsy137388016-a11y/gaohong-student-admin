import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Field, inputClass, PageTitle, Panel, PrimaryButton, textareaClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { assertStudentAccess, classWhereForUser, requireModuleAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { updateStudent } from "../../actions";

type PageProps = {
  params: Promise<{ id: string }>;
};

function StudentNotFound({ user }: { user: { name: string; username: string; role: string } }) {
  return (
    <DashboardLayout user={user}>
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle size={48} className="mb-4 text-amber-500" />
        <h2 className="mb-2 text-xl font-semibold text-slate-900">学生不存在或已退学</h2>
        <p className="mb-6 text-sm text-slate-500">该学生可能已退学或不存在，请返回学生管理查看。</p>
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

export default async function EditStudentPage({ params }: PageProps) {
  const user = await requireUser();
  requireModuleAccess(user, "students");
  const { id } = await params;

  // 验证 id 是否为有效整数
  const studentId = Number(id);
  if (!Number.isInteger(studentId)) {
    return <StudentNotFound user={user} />;
  }

  let student: any = null;
  try {
    student = await prisma.student.findUnique({ where: { id: studentId } });
  } catch {
    return <StudentNotFound user={user} />;
  }

  if (!student) return <StudentNotFound user={user} />;
  if (student.status === "withdrawn" || student.status === "inactive" || student.status === "deleted") return <StudentNotFound user={user} />;

  let classes: any[] = [];
  try {
    classes = await prisma.classRoom.findMany({ where: { status: "active" }, orderBy: [{ grade: "desc" }, { name: "asc" }] });
  } catch {
    try {
      classes = await prisma.classRoom.findMany({ orderBy: [{ grade: "desc" }, { name: "asc" }] });
      classes = classes.filter((c: any) => c.status !== "inactive");
    } catch {
      classes = [];
    }
  }

  return (
    <DashboardLayout user={user}>
      <PageTitle title="编辑学生" description="修改学生档案信息。" />
      <Panel>
        <form action={updateStudent.bind(null, student.id)} className="grid gap-4 md:grid-cols-2">
          <Field label="姓名" required>
            <input name="name" required defaultValue={student.name} className={inputClass} />
          </Field>
          <Field label="性别" required>
            <select name="gender" required defaultValue={student.gender} className={inputClass}>
              <option value="male">男</option>
              <option value="female">女</option>
            </select>
          </Field>
          <Field label="年级" required>
            <input name="grade" required defaultValue={student.grade} className={inputClass} />
          </Field>
          <Field label="班级">
            <select name="classId" defaultValue={student.classId || ""} className={inputClass}>
              <option value="">暂不分班</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.grade} {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="手机号">
            <input name="phone" defaultValue={student.phone || ""} className={inputClass} />
          </Field>
          <Field label="家长姓名" required>
            <input name="parentName" required defaultValue={student.parentName} className={inputClass} />
          </Field>
          <Field label="家长电话" required>
            <input name="parentPhone" required defaultValue={student.parentPhone} className={inputClass} />
          </Field>
          <Field label="住宿状态" required>
            <select name="boardingStatus" required defaultValue={student.boardingStatus} className={inputClass}>
              <option value="boarding">住宿</option>
              <option value="day_student">走读</option>
            </select>
          </Field>
          <Field label="艺考专业">
            <input name="artMajor" defaultValue={student.artMajor || ""} className={inputClass} />
          </Field>
          <div className="md:col-span-2">
            <Field label="备注">
              <textarea name="remark" defaultValue={student.remark || ""} className={textareaClass} />
            </Field>
          </div>
          <div className="md:col-span-2">
            <PrimaryButton>保存学生</PrimaryButton>
          </div>
        </form>
      </Panel>
    </DashboardLayout>
  );
}
