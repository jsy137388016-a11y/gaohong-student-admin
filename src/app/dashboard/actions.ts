"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function deleteCommunication(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    await requireUser();

    // 检查记录是否存在
    const existing = await prisma.communication.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "记录不存在或已被删除" };
    }

    await prisma.communication.delete({ where: { id } });
    revalidatePath("/dashboard");
    revalidatePath("/communications");
    return { success: true };
  } catch (error: any) {
    console.error("[DELETE_COMMUNICATION]", error);
    return { success: false, error: error?.message || "删除失败，请稍后重试" };
  }
}
