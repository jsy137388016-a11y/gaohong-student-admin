"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageAccounts, requireAccountManageAccess, roleCodeOf } from "@/lib/permissions";

const roleValues = ["admin", "principal", "minister", "moral_director", "head_teacher", "subject_teacher"] as const;
const scopeTypes = ["school", "department", "class"] as const;
const accountStatuses = ["active", "disabled"] as const;
const schoolScopeRoles = new Set(["admin", "principal", "moral_director"]);
const departmentScopeRoles = new Set(["minister"]);
const classScopeRoles = new Set(["head_teacher", "subject_teacher"]);

function fieldValue(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function fieldValues(formData: FormData, key: string) {
  return formData.getAll(key).map((value) => String(value).trim()).filter(Boolean);
}

function redirectToSettings(params: { notice?: string; error?: string }): never {
  const query = new URLSearchParams();
  if (params.notice) query.set("notice", params.notice);
  if (params.error) query.set("error", params.error);
  redirect(`/settings?${query.toString()}`);
}

function scopeForRole(role: string, formData: FormData) {
  if (schoolScopeRoles.has(role)) return { scopeType: "school", scopeValue: null as string | null };
  const scopeType = departmentScopeRoles.has(role) ? "department" : classScopeRoles.has(role) ? "class" : fieldValue(formData, "scopeType") || "school";
  if (!scopeTypes.includes(scopeType as (typeof scopeTypes)[number])) redirectToSettings({ error: "数据范围不正确" });
  const values = scopeType === "department" ? fieldValues(formData, "departmentScopeValues") : fieldValues(formData, "classScopeValues");
  if (scopeType !== "school" && values.length === 0) redirectToSettings({ error: "请选择至少一个权限范围" });
  return { scopeType, scopeValue: scopeType === "school" ? null : JSON.stringify(values) };
}

export async function createUserAccount(formData: FormData) {
  const currentUser = await requireUser();
  if (!canManageAccounts(currentUser)) redirectToSettings({ error: "只有管理员可以新增账号" });

  const username = fieldValue(formData, "username");
  const name = fieldValue(formData, "name");
  const password = fieldValue(formData, "password");
  const role = fieldValue(formData, "role");

  if (!username || !name || !password || !role) redirectToSettings({ error: "请填写完整账号信息" });
  if (!roleValues.includes(role as (typeof roleValues)[number])) redirectToSettings({ error: "角色不正确" });
  if (password.length < 6) redirectToSettings({ error: "密码至少需要6位" });

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) redirectToSettings({ error: "账号已存在，请换一个账号名" });

  const { scopeType, scopeValue } = scopeForRole(role, formData);
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      username,
      name,
      passwordHash,
      role: role as (typeof roleValues)[number],
      roleCode: role,
      scopeType,
      scopeValue,
      status: "active"
    }
  });

  revalidatePath("/settings");
  redirectToSettings({ notice: "账号已创建成功" });
}

export async function updateUserPermission(id: number, formData: FormData) {
  const currentUser = await requireUser();
  requireAccountManageAccess(currentUser);

  const role = fieldValue(formData, "role");
  const status = fieldValue(formData, "status") || "active";

  if (!roleValues.includes(role as (typeof roleValues)[number])) redirectToSettings({ error: "角色不正确" });
  if (!accountStatuses.includes(status as (typeof accountStatuses)[number])) redirectToSettings({ error: "账号状态不正确" });
  if (id === currentUser.id && status !== "active") redirectToSettings({ error: "不能停用当前登录账号" });

  const { scopeType, scopeValue } = scopeForRole(role, formData);
  await prisma.user.update({
    where: { id },
    data: {
      role: role as (typeof roleValues)[number],
      roleCode: role,
      scopeType,
      scopeValue,
      status
    }
  });

  revalidatePath("/settings");
  redirectToSettings({ notice: "账号权限已更新" });
}

export async function resetUserPassword(id: number, formData: FormData) {
  const currentUser = await requireUser();
  requireAccountManageAccess(currentUser);

  const password = fieldValue(formData, "password");
  if (password.length < 6) redirectToSettings({ error: "新密码至少需要6位" });

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id }, data: { passwordHash } });

  revalidatePath("/settings");
  redirectToSettings({ notice: "密码已重置" });
}

export async function deleteUserAccount(id: number) {
  const currentUser = await requireUser();
  requireAccountManageAccess(currentUser);
  if (id === currentUser.id) redirectToSettings({ error: "不能删除当前登录账号" });

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.status === "deleted") redirectToSettings({ error: "账号不存在或已删除" });

  if (roleCodeOf(target) === "admin") {
    const adminCount = await prisma.user.count({ where: { roleCode: "admin", status: { not: "deleted" } } });
    if (adminCount <= 1) redirectToSettings({ error: "不能删除唯一管理员" });
  }

  await prisma.user.update({ where: { id }, data: { status: "deleted" } });
  revalidatePath("/settings");
  redirectToSettings({ notice: "账号已删除。为保留历史业务记录，系统已执行软删除" });
}
