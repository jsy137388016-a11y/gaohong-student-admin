"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { dateValue, numberValue, optionalNumber, textValue } from "@/lib/forms";
import { assertModuleAccess, assertStudentAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function createDiscipline(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireUser();
    assertModuleAccess(user, "discipline");
    const studentId = optionalNumber(formData, "studentId");
    if (!studentId) throw new Error("请选择学生");
    await assertStudentAccess(user, studentId);
    const violationType = textValue(formData, "violationType");
    if (!violationType) throw new Error("请填写违纪类型");
    const deductScore = numberValue(formData, "deductScore", 0);
    if (deductScore < 0) throw new Error("扣分不能为负数");
    await prisma.discipline.create({
      data: {
        studentId,
        violationType,
        description: textValue(formData, "description", false) ?? "",
        result: textValue(formData, "result", false) ?? "",
        deductScore,
        parentNotified: formData.get("parentNotified") === "on",
        follower: textValue(formData, "follower", false) ?? "",
        remark: textValue(formData, "remark", false),
        recordedAt: dateValue(formData, "recordedAt")
      }
    });
    return { success: true };
  } catch (e: any) {
    console.error("[createDiscipline]", e?.message ?? e);
    return { success: false, error: e?.message || "提交失败，请稍后重试" };
  }
}

export async function deleteDiscipline(id: number) {
  const user = await requireUser();
  assertModuleAccess(user, "discipline");
  const record = await prisma.discipline.findUnique({ where: { id } });
  if (!record) throw new Error("记录不存在");
  await assertStudentAccess(user, record.studentId);
  await prisma.discipline.delete({ where: { id } });
  revalidatePath("/discipline");
  revalidatePath("/dashboard");
  revalidatePath(`/students/${record.studentId}`);
}
