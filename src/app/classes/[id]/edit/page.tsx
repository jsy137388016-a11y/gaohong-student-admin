import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Field, inputClass, PageTitle, Panel, PrimaryButton, textareaClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateClass } from "../../actions";

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

export default async function EditClassPage({ params }: PageProps) {
  const user = await requireUser();
  const { id } = await params;

  const classId = Number(id);
  if (!Number.isInteger(classId)) {
    return <ClassNotFound user={user} />;
  }

  const classRoom = await prisma.classRoom.findFirst({ where: { id: classId, status: "active" } });

  if (!classRoom) {
    return <ClassNotFound user={user} />;
  }

  return (
    <DashboardLayout user={user}>
      <PageTitle title="编辑班级" description="修改班级基础信息。" />
      <Panel>
        <form action={updateClass.bind(null, classRoom.id)} className="grid gap-4 md:grid-cols-2">
          <Field label="班级名称" required>
            <input name="name" required defaultValue={classRoom.name} className={inputClass} />
          </Field>
          <Field label="年级" required>
            <input name="grade" required defaultValue={classRoom.grade} className={inputClass} />
          </Field>
          <Field label="班主任" required>
            <input name="headTeacher" required defaultValue={classRoom.headTeacher} className={inputClass} />
          </Field>
          <div className="md:col-span-2">
            <Field label="备注">
              <textarea name="remark" defaultValue={classRoom.remark || ""} className={textareaClass} />
            </Field>
          </div>
          <div className="md:col-span-2">
            <PrimaryButton>保存班级</PrimaryButton>
          </div>
        </form>
      </Panel>
    </DashboardLayout>
  );
}
