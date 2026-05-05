"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { dateValue, optionalNumber, textValue } from "@/lib/forms";
import { prisma } from "@/lib/prisma";

export async function createAttendance(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    await requireUser();
    const studentId = optionalNumber(formData, "studentId");
    if (!studentId) return { success: false, error: "请选择学生" };
    await prisma.attendance.create({
      data: {
        studentId,
        date: dateValue(formData, "date"),
        type: textValue(formData, "type") as "normal" | "late" | "leave" | "absent" | "early_leave" | "dorm_absent",
        period: textValue(formData, "period", false) || "",
        description: textValue(formData, "description", false),
        recorder: textValue(formData, "recorder")!
      }
    });
    return { success: true };
  } catch (error) {
    console.error("createAttendance error:", error);
    return { success: false, error: "新增考勤失败：" + (error instanceof Error ? error.message : "未知错误") };
  }
}

export async function deleteAttendance(id: number) {
  await requireUser();
  await prisma.attendance.delete({ where: { id } });
  revalidatePath("/attendance");
  revalidatePath("/dashboard");
}
