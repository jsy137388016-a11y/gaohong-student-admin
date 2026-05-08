"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const roleValues = ["admin", "principal", "minister", "moral_director", "head_teacher", "subject_teacher"] as const;

function fieldValue(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function redirectToSettings(params: { notice?: string; error?: string }) {
  const query = new URLSearchParams();
  if (params.notice) query.set("notice", params.notice);
  if (params.error) query.set("error", params.error);
  redirect(`/settings?${query.toString()}`);
}

export async function createUserAccount(formData: FormData) {
  const currentUser = await requireUser();
  if (!["admin", "principal"].includes(currentUser.role)) {
    redirectToSettings({ error: "只有管理员和校长可以新增账号" });
  }

  const username = fieldValue(formData, "username");
  const name = fieldValue(formData, "name");
  const password = fieldValue(formData, "password");
  const role = fieldValue(formData, "role");

  if (!username || !name || !password || !role) {
    redirectToSettings({ error: "请填写完整账号信息" });
  }

  if (!roleValues.includes(role as (typeof roleValues)[number])) {
    redirectToSettings({ error: "角色不正确" });
  }

  if (password.length < 6) {
    redirectToSettings({ error: "密码至少需要6位" });
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    redirectToSettings({ error: "账号已存在，请换一个账号名" });
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
  redirectToSettings({ notice: "账号已创建成功" });
}
