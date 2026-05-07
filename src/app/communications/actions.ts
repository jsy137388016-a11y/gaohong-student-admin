"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { dateValue, optionalNumber, textValue } from "@/lib/forms";
import { prisma } from "@/lib/prisma";

export async function createCommunication(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    await requireUser();
    const studentId = optionalNumber(formData, "studentId");
    if (!studentId) throw new Error("请选择学生");
    await prisma.communication.create({
      data: {
        studentId,
        target: textValue(formData, "target")!,
        method: textValue(formData, "method") as "phone" | "wechat" | "onsite" | "message" | "other",
        content: textValue(formData, "content")!,
        parentFeedback: textValue(formData, "parentFeedback", false),
        followUp: textValue(formData, "followUp", false),
        communicator: textValue(formData, "communicator")!,
        contactedAt: dateValue(formData, "contactedAt"),
        remark: textValue(formData, "remark", false)
      }
    });
    revalidatePath("/communications");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("createCommunication error:", error);
    return { success: false, error: "新增沟通记录失败：" + (error instanceof Error ? error.message : "未知错误") };
  }
}

export async function deleteCommunication(id: number) {
  try {
    await requireUser();
    await prisma.communication.delete({ where: { id } });
    revalidatePath("/communications");
    revalidatePath("/dashboard");
    redirect("/communications?notice=沟通记录已删除");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    console.error("deleteCommunication error:", error);
    throw new Error("删除沟通记录失败：" + (error instanceof Error ? error.message : "未知错误"));
  }
}
