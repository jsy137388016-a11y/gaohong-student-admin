"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  try {
    await requireUser();
    await prisma.attendance.delete({ where: { id } });
    revalidatePath("/attendance");
    revalidatePath("/dashboard");
    redirect("/attendance?notice=考勤记录已删除");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    console.error("deleteAttendance error:", error);
    throw new Error("删除考勤失败：" + (error instanceof Error ? error.message : "未知错误"));
  }
}

export async function createBatchAttendance(formData: FormData): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    await requireUser();
    const studentIds = formData
      .getAll("studentIds")
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);

    if (studentIds.length === 0) return { success: false, error: "请至少选择一名学生" };

    const type = textValue(formData, "type") as "normal" | "late" | "leave" | "absent" | "early_leave" | "dorm_absent";
    const date = dateValue(formData, "date");
    const period = textValue(formData, "period", false) || "";
    const description = textValue(formData, "description", false);
    const recorder = textValue(formData, "recorder")!;

    await prisma.attendance.createMany({
      data: studentIds.map((studentId) => ({
        studentId,
        date,
        type,
        period,
        description,
        recorder
      }))
    });

    revalidatePath("/attendance");
    revalidatePath("/dashboard");
    return { success: true, count: studentIds.length };
  } catch (error) {
    console.error("createBatchAttendance error:", error);
    return { success: false, error: "批量录入失败：" + (error instanceof Error ? error.message : "未知错误") };
  }
}
