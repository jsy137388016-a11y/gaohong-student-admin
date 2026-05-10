"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionErrorMessage, actionUrl, isNextRedirectError } from "@/lib/action-utils";
import { requireUser } from "@/lib/auth";
import { dateValue, optionalNumber, textValue } from "@/lib/forms";
import { assertModuleAccess, assertStudentAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

function redirectToCommunications(params: { notice?: string; error?: string }): never {
  redirect(actionUrl("/communications", params));
}

export async function createCommunication(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireUser();
    assertModuleAccess(user, "communications");
    const studentId = optionalNumber(formData, "studentId");
    if (!studentId) throw new Error("请选择学生");
    await assertStudentAccess(user, studentId);
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
    return { success: false, error: "新增沟通记录失败：" + actionErrorMessage(error) };
  }
}

export async function deleteCommunication(id: number) {
  try {
    const user = await requireUser();
    assertModuleAccess(user, "communications");
    const record = await prisma.communication.findUnique({ where: { id }, select: { studentId: true } });
    if (!record) throw new Error("记录不存在");
    await assertStudentAccess(user, record.studentId);
    await prisma.communication.delete({ where: { id } });
    revalidatePath("/communications");
    revalidatePath("/dashboard");
    redirectToCommunications({ notice: "沟通记录已删除" });
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    console.error("deleteCommunication error:", error);
    redirectToCommunications({ error: "删除沟通记录失败：" + actionErrorMessage(error) });
  }
}
