"use server";

import { redirect } from "next/navigation";
import { login } from "@/lib/auth";

export async function loginAction(_prevState: { error: string }, formData: FormData) {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "").trim();

  if (!username || !password) {
    return { error: "请输入账号和密码" };
  }

  const user = await login(username, password);
  if (!user) {
    return { error: "账号或密码不正确" };
  }

  redirect("/dashboard");
}
