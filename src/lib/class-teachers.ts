import { prisma } from "@/lib/prisma";

export type ClassTeacherOption = {
  id: number;
  username: string;
  name: string;
  role: string;
  roleCode: string;
};

export async function getClassTeacherOptions(): Promise<ClassTeacherOption[]> {
  const users = await prisma.user.findMany({
    where: {
      status: "active",
      OR: [
        { roleCode: { in: ["head_teacher", "homeroom_teacher", "subject_teacher"] } },
        { role: { in: ["head_teacher", "subject_teacher"] } }
      ]
    },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      roleCode: true
    },
    orderBy: [{ name: "asc" }, { username: "asc" }]
  });

  return users.map((user) => ({
    id: user.id,
    username: user.username,
    name: user.name,
    role: String(user.role),
    roleCode: user.roleCode || String(user.role)
  }));
}

export function findClassTeacherOption(options: ClassTeacherOption[], rawValue: string | null | undefined) {
  const value = String(rawValue || "").trim();
  if (!value) return null;
  return options.find((option) => (
    String(option.id) === value ||
    option.username === value ||
    option.name === value
  )) || null;
}
