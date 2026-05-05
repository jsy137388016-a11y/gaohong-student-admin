"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { textValue } from "@/lib/forms";
import { prisma } from "@/lib/prisma";

const roleValues = ["admin", "principal", "minister", "moral_director", "head_teacher", "subject_teacher"] as const;

export async function createUserAccount(formData: FormData) {
  const currentUser = await requireUser();
  if (!["admin", "principal"].includes(currentUser.role)) {
    redirect("/settings?accountError=只有管理员和校长可以新增账号");
  }

  const username = textValue(formData, "username")!;
  const name = textValue(formData, "name")!;
  const password = textValue(formData, "password")!;
  const role = textValue(formData, "role")!;

  if (!roleValues.includes(role as (typeof roleValues)[number])) {
    redirect("/settings?accountError=角色不正确");
  }

  if (password.length < 6) {
    redirect("/settings?accountError=密码至少需要6位");
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    redirect("/settings?accountError=账号已存在，请换一个账号名");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      username,
      name,
      passwordHash,
      role: role as (typeof roleValues)[number]
    }
  });

  revalidatePath("/settings");
  redirect("/settings?accountCreated=1");
}
