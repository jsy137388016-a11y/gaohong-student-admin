import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const MODULES = [
  "dashboard",
  "students",
  "classes",
  "attendance",
  "discipline",
  "exams",
  "focus",
  "communications",
  "settings"
] as const;

export type ModuleKey = (typeof MODULES)[number];

export type AuthUser = {
  id?: number;
  username: string;
  name: string;
  role: string;
  roleCode?: string | null;
  scopeType?: string | null;
  scopeValue?: string | null;
  status?: string | null;
};

const roleModules: Record<string, ModuleKey[]> = {
  admin: [...MODULES],
  principal: ["dashboard", "students", "classes", "attendance", "discipline", "exams", "focus", "communications"],
  moral_director: ["dashboard", "students", "classes", "attendance", "discipline", "exams", "focus", "communications"],
  minister: ["dashboard", "students", "classes", "attendance", "discipline", "exams", "focus", "communications"],
  head_teacher: ["dashboard", "students", "classes", "attendance", "discipline", "exams", "focus", "communications"],
  subject_teacher: ["dashboard", "students", "classes", "attendance", "discipline", "exams"]
};

export function roleCodeOf(user: AuthUser) {
  return user.roleCode || user.role || "subject_teacher";
}

export function scopeTypeOf(user: AuthUser) {
  const roleCode = roleCodeOf(user);
  if (user.scopeType) return user.scopeType;
  if (["admin", "principal", "moral_director"].includes(roleCode)) return "school";
  if (roleCode === "minister") return "department";
  return "class";
}

export function scopeValueOf(user: AuthUser) {
  return user.scopeValue || (scopeTypeOf(user) === "class" ? user.name : "");
}

export function canAccessModule(user: AuthUser, module: ModuleKey) {
  if (user.status && user.status !== "active") return false;
  return (roleModules[roleCodeOf(user)] || []).includes(module);
}

export function allowedModulesFor(user: AuthUser) {
  return MODULES.filter((module) => canAccessModule(user, module));
}

function redirectWithError(path: string, message: string): never {
  const query = new URLSearchParams({ error: message });
  redirect(`${path}?${query.toString()}`);
}

export function requireModuleAccess(user: AuthUser, module: ModuleKey) {
  if (!canAccessModule(user, module)) redirectWithError("/dashboard", "当前账号没有访问该模块的权限");
}

export function assertModuleAccess(user: AuthUser, module: ModuleKey) {
  if (!canAccessModule(user, module)) throw new Error("当前账号没有访问该模块的权限");
}

export function canManageAccounts(user: AuthUser) {
  return roleCodeOf(user) === "admin" && (!user.status || user.status === "active");
}

export function requireAccountManageAccess(user: AuthUser) {
  if (!canManageAccounts(user)) redirectWithError("/dashboard", "只有管理员可以管理账号权限");
}

function andWhere(...items: any[]) {
  const filtered = items.filter((item) => item && Object.keys(item).length > 0);
  if (filtered.length === 0) return {};
  if (filtered.length === 1) return filtered[0];
  return { AND: filtered };
}

function scopedClassWhere(user: AuthUser) {
  const type = scopeTypeOf(user);
  const value = scopeValueOf(user);
  if (type === "school") return {};
  if (!value) return { id: -1 };
  const numeric = Number(value);
  if (type === "class" && Number.isInteger(numeric) && numeric > 0) return { id: numeric };
  if (type === "class") {
    return { OR: [{ headTeacher: value }, { name: { contains: value } }] };
  }
  return { OR: [{ grade: value }, { name: { contains: value } }] };
}

export function classWhereForUser(user: AuthUser, extra: any = {}) {
  return andWhere(scopedClassWhere(user), extra);
}

export function studentWhereForUser(user: AuthUser, extra: any = {}) {
  const type = scopeTypeOf(user);
  const value = scopeValueOf(user);
  let scopeWhere: any = {};
  if (type === "department") {
    scopeWhere = value
      ? { OR: [{ grade: value }, { classRoom: { grade: value } }, { classRoom: { name: { contains: value } } }] }
      : { id: -1 };
  }
  if (type === "class") {
    if (!value) scopeWhere = { id: -1 };
    else {
      const numeric = Number(value);
      scopeWhere = Number.isInteger(numeric) && numeric > 0
        ? { classId: numeric }
        : { classRoom: { OR: [{ headTeacher: value }, { name: { contains: value } }] } };
    }
  }
  return andWhere(scopeWhere, extra);
}

export async function assertStudentAccess(user: AuthUser, studentId: number) {
  const student = await prisma.student.findFirst({ where: studentWhereForUser(user, { id: studentId }), select: { id: true } });
  if (!student) throw new Error("当前账号没有访问该学生数据的权限");
}

export async function assertClassAccess(user: AuthUser, classId: number) {
  const classRoom = await prisma.classRoom.findFirst({ where: classWhereForUser(user, { id: classId }), select: { id: true } });
  if (!classRoom) throw new Error("当前账号没有访问该班级数据的权限");
}

export async function assertStudentsAccess(user: AuthUser, studentIds: number[]) {
  if (studentIds.length === 0) return;
  const count = await prisma.student.count({ where: studentWhereForUser(user, { id: { in: studentIds } }) });
  if (count !== studentIds.length) throw new Error("当前账号没有访问部分学生数据的权限");
}
