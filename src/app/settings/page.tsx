import { DashboardLayout } from "@/components/dashboard-layout";
import { AddButton, Field, inputClass, PageTitle, Panel } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { accountStatusLabels, displayValue, firstValue, roleLabels, scopeTypeLabels } from "@/lib/format";
import { canManageAccounts, requireModuleAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createUserAccount, resetUserPassword, updateUserPermission } from "./actions";

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

const scopeOptions = [["school", "全校"], ["department", "部门"], ["class", "班级"]];
const statusOptions = [["active", "启用"], ["disabled", "停用"]];

export default async function SettingsPage({ searchParams }: PageProps) {
  const user = await requireUser();
  requireModuleAccess(user, "settings");
  const params = (await searchParams) || {};
  const notice = firstValue(params.accountCreated) ? "账号已创建成功" : firstValue(params.notice);
  const error = firstValue(params.accountError) || firstValue(params.error);
  const canEditAccounts = canManageAccounts(user);

  let users: any[] = [];
  try {
    users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        roleCode: true,
        scopeType: true,
        scopeValue: true,
        status: true
      },
      orderBy: { id: "asc" }
    });
  } catch {
    users = [];
  }

  return (
    <DashboardLayout user={user}>
      <PageTitle title="系统设置" description="管理员可管理账号、角色、数据范围、账号状态和密码。" />

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Panel title="账号权限管理">
          <div className="overflow-x-auto">
            <table className="min-w-[1080px] divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">账号</th>
                  <th className="px-4 py-3">姓名</th>
                  <th className="px-4 py-3">角色</th>
                  <th className="px-4 py-3">数据范围</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3">授权</th>
                  <th className="px-4 py-3">重置密码</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {users.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">暂无数据</td></tr>
                ) : users.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-medium">{displayValue(item.username)}</td>
                    <td className="px-4 py-3">{displayValue(item.name)}</td>
                    <td className="px-4 py-3">{roleLabels[item.roleCode || item.role] || displayValue(item.roleCode || item.role)}</td>
                    <td className="px-4 py-3">
                      {scopeTypeLabels[item.scopeType || "school"] || displayValue(item.scopeType)}
                      {item.scopeValue ? <span className="ml-1 text-slate-500">({item.scopeValue})</span> : null}
                    </td>
                    <td className="px-4 py-3">{accountStatusLabels[item.status || "active"] || displayValue(item.status)}</td>
                    <td className="px-4 py-3">
                      <form action={updateUserPermission.bind(null, item.id)} className="grid min-w-[420px] gap-2 md:grid-cols-[120px_110px_1fr_90px_auto]">
                        <select name="role" defaultValue={item.roleCode || item.role || "subject_teacher"} className={inputClass} disabled={!canEditAccounts}>
                          {roleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                        <select name="scopeType" defaultValue={item.scopeType || "school"} className={inputClass} disabled={!canEditAccounts}>
                          {scopeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                        <input name="scopeValue" defaultValue={item.scopeValue || ""} placeholder="年级/部门/班主任/班级ID" className={inputClass} disabled={!canEditAccounts} />
                        <select name="status" defaultValue={item.status || "active"} className={inputClass} disabled={!canEditAccounts || item.id === user.id}>
                          {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                        <button disabled={!canEditAccounts} className="h-10 rounded bg-brand-600 px-3 text-sm font-medium text-white disabled:opacity-50">保存</button>
                      </form>
                    </td>
                    <td className="px-4 py-3">
                      <form action={resetUserPassword.bind(null, item.id)} className="flex min-w-[220px] gap-2">
                        <input name="password" type="password" minLength={6} placeholder="新密码" className={inputClass} disabled={!canEditAccounts} />
                        <button disabled={!canEditAccounts} className="h-10 rounded border border-slate-300 px-3 text-sm disabled:opacity-50">重置</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="新增账号">
          {notice ? <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div> : null}
          {error ? <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div> : null}

          {canEditAccounts ? (
            <form action={createUserAccount} className="grid gap-4">
              <Field label="登录账号" required><input name="username" required placeholder="例如 teacher3" className={inputClass} /></Field>
              <Field label="姓名" required><input name="name" required placeholder="例如 张老师" className={inputClass} /></Field>
              <Field label="初始密码" required><input name="password" type="password" required minLength={6} placeholder="至少6位" className={inputClass} /></Field>
              <Field label="角色" required>
                <select name="role" required defaultValue="head_teacher" className={inputClass}>{roleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
              </Field>
              <Field label="数据范围" required>
                <select name="scopeType" required defaultValue="class" className={inputClass}>{scopeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
              </Field>
              <Field label="范围值"><input name="scopeValue" placeholder="全校留空；部门填年级/部门；班级填班主任姓名或班级ID" className={inputClass} /></Field>
              <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">班主任建议选择“班级”范围；部长建议选择“部门”范围。</div>
              <AddButton>新增账号</AddButton>
            </form>
          ) : <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">只有管理员可以新增和修改账号权限。</div>}
        </Panel>
      </div>
    </DashboardLayout>
  );
}
