import { DashboardLayout } from "@/components/dashboard-layout";
import { AddButton, Field, inputClass, PageTitle, Panel } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { firstValue, roleLabels } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { createUserAccount } from "./actions";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const roleOptions = [
  ["admin", "管理员"],
  ["principal", "校长"],
  ["minister", "部长"],
  ["moral_director", "德育主任"],
  ["head_teacher", "班主任"],
  ["subject_teacher", "任课老师"]
];

export default async function SettingsPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const params = (await searchParams) || {};
  const accountCreated = firstValue(params.accountCreated);
  const accountError = firstValue(params.accountError);
  const canManageAccounts = ["admin", "principal"].includes(user.role);
  let users: any[] = [];
  try {
    users = await prisma.user.findMany({ orderBy: { id: "asc" } });
  } catch {
    users = [];
  }

  return (
    <DashboardLayout user={user}>
      <PageTitle title="系统设置" description="管理后台账号和角色。班主任账号需要和班级中的班主任姓名一致，才能看到对应班级学生。" />

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Panel title="账号角色">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-4 py-3">账号</th>
                <th className="px-4 py-3">姓名</th>
                <th className="px-4 py-3">角色</th>
                <th className="px-4 py-3">说明</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {users.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium">{item.username}</td>
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">{roleLabels[item.role]}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {item.role === "head_teacher" ? "班级的班主任字段需填写此姓名" : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="新增账号">
          {accountCreated ? (
            <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">账号已创建成功。</div>
          ) : null}
          {accountError ? (
            <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{accountError}</div>
          ) : null}

          {canManageAccounts ? (
            <form action={createUserAccount} className="grid gap-4">
              <Field label="登录账号" required>
                <input name="username" required placeholder="例如 teacher3" className={inputClass} />
              </Field>
              <Field label="姓名" required>
                <input name="name" required placeholder="例如 张老师" className={inputClass} />
              </Field>
              <Field label="初始密码" required>
                <input name="password" type="password" required minLength={6} placeholder="至少6位" className={inputClass} />
              </Field>
              <Field label="角色" required>
                <select name="role" required defaultValue="head_teacher" className={inputClass}>
                  {roleOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                添加班主任后，请到“班级管理”中编辑班级，把班主任填写成该账号的“姓名”。
              </div>
              <AddButton>新增账号</AddButton>
            </form>
          ) : (
            <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">只有管理员和校长可以新增账号。</div>
          )}
        </Panel>
      </div>
    </DashboardLayout>
  );
}
