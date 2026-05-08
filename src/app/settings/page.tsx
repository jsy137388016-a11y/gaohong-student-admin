import { DashboardLayout } from "@/components/dashboard-layout";
import { AddButton, ConfirmButton, Field, inputClass, PageTitle, Panel } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { accountStatusLabels, displayValue, firstValue, roleLabels, scopeTypeLabels } from "@/lib/format";
import { canManageAccounts, requireModuleAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createUserAccount, deleteUserAccount, resetUserPassword, updateUserPermission } from "./actions";

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

const statusOptions = [["active", "启用"], ["disabled", "停用"]];

function parseScopeValues(value?: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map((item) => String(item)).filter(Boolean);
  } catch {
    // Compatible with legacy single-value scopeValue.
  }
  return [String(value)];
}

function scopeDisplay(item: any, classLabelMap: Map<string, string>) {
  const scopeType = item.scopeType || "school";
  if (scopeType === "school") return "全校";
  const values = parseScopeValues(item.scopeValue);
  if (values.length === 0) return "—";
  if (scopeType === "class") return values.map((value) => classLabelMap.get(value) || value).join("、");
  return values.join("、");
}

export default async function SettingsPage({ searchParams }: PageProps) {
  const user = await requireUser();
  requireModuleAccess(user, "settings");
  const params = (await searchParams) || {};
  const notice = firstValue(params.accountCreated) ? "账号已创建成功" : firstValue(params.notice);
  const error = firstValue(params.accountError) || firstValue(params.error);
  const canEditAccounts = canManageAccounts(user);

  let users: any[] = [];
  let classes: any[] = [];
  let departmentOptions: string[] = [];
  try {
    const [userRows, classRows, studentRows] = await Promise.all([
      prisma.user.findMany({
        where: { status: { not: "deleted" } },
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
      }),
      prisma.classRoom.findMany({
        where: { status: "active" },
        select: { id: true, name: true, grade: true, headTeacher: true },
        orderBy: [{ grade: "desc" }, { name: "asc" }]
      }),
      prisma.student.findMany({
        where: { status: "active" },
        select: { grade: true }
      })
    ]);
    users = userRows;
    classes = classRows;
    departmentOptions = Array.from(new Set([...classRows.map((item) => item.grade), ...studentRows.map((item) => item.grade)].filter(Boolean))).sort().reverse();
  } catch {
    users = [];
    classes = [];
    departmentOptions = [];
  }

  const classLabelMap = new Map(classes.map((item) => [String(item.id), `${item.grade} ${item.name}`]));

  return (
    <DashboardLayout user={user}>
      <PageTitle title="系统设置" description="管理员可管理账号、角色、数据范围、账号状态和密码。" />

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <Panel title="账号权限管理">
          <div className="overflow-x-auto">
            <table className="min-w-[1280px] divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">账号</th>
                  <th className="px-4 py-3">姓名</th>
                  <th className="px-4 py-3">角色</th>
                  <th className="px-4 py-3">数据范围</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3">授权</th>
                  <th className="px-4 py-3">重置密码</th>
                  <th className="px-4 py-3">删除</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {users.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">暂无数据</td></tr>
                ) : users.map((item) => {
                  const role = item.roleCode || item.role || "subject_teacher";
                  const selectedScopes = parseScopeValues(item.scopeValue);
                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium">{displayValue(item.username)}</td>
                      <td className="px-4 py-3">{displayValue(item.name)}</td>
                      <td className="px-4 py-3">{roleLabels[role] || displayValue(role)}</td>
                      <td className="px-4 py-3">
                        <div>{scopeTypeLabels[item.scopeType || "school"] || displayValue(item.scopeType)}</div>
                        <div className="mt-1 max-w-[220px] text-xs text-slate-500">{scopeDisplay(item, classLabelMap)}</div>
                      </td>
                      <td className="px-4 py-3">{accountStatusLabels[item.status || "active"] || displayValue(item.status)}</td>
                      <td className="px-4 py-3">
                        <form action={updateUserPermission.bind(null, item.id)} className="grid min-w-[560px] gap-2 md:grid-cols-[120px_110px_1fr_1fr_90px_auto]">
                          <select name="role" defaultValue={role} className={inputClass} disabled={!canEditAccounts}>
                            {roleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </select>
                          <select name="status" defaultValue={item.status || "active"} className={inputClass} disabled={!canEditAccounts || item.id === user.id}>
                            {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </select>
                          <select name="classScopeValues" multiple defaultValue={selectedScopes} className={`${inputClass} h-24`} disabled={!canEditAccounts}>
                            {classes.map((classItem) => <option key={classItem.id} value={classItem.id}>{classItem.grade} {classItem.name}</option>)}
                          </select>
                          <select name="departmentScopeValues" multiple defaultValue={selectedScopes} className={`${inputClass} h-24`} disabled={!canEditAccounts}>
                            {departmentOptions.map((value) => <option key={value} value={value}>{value}</option>)}
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
                      <td className="px-4 py-3">
                        <form action={deleteUserAccount.bind(null, item.id)}>
                          <ConfirmButton label="删除" confirmText={`确认删除账号 ${item.username} 吗？系统会做软删除，历史业务记录不会丢失。`} />
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-xs leading-5 text-slate-500">
            管理员/校长/德育主任默认为全校；部长使用部门/年级多选；班主任和任课老师使用班级多选。多选框按住 Ctrl/Command 可多选。
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
              <Field label="班级范围（班主任/任课老师）">
                <select name="classScopeValues" multiple className={`${inputClass} h-32`}>
                  {classes.map((item) => <option key={item.id} value={item.id}>{item.grade} {item.name}</option>)}
                </select>
              </Field>
              <Field label="部门范围（部长）">
                <select name="departmentScopeValues" multiple className={`${inputClass} h-24`}>
                  {departmentOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </Field>
              <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">管理员、校长、德育主任自动拥有全校范围，不需要选择范围。</div>
              <AddButton>新增账号</AddButton>
            </form>
          ) : <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">只有管理员可以新增和修改账号权限。</div>}
        </Panel>
      </div>
    </DashboardLayout>
  );
}
