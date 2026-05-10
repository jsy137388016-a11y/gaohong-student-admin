"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionErrorMessage, isNextRedirectError } from "@/lib/action-utils";
import { requireUser } from "@/lib/auth";
import { dateValue, optionalNumber, textValue } from "@/lib/forms";
import { assertModuleAccess, assertStudentAccess, assertStudentsAccess, isHomeroomTeacher } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

function redirectToAttendance(params: { notice?: string; error?: string }): never {
  const query = new URLSearchParams();
  if (params.notice) query.set("notice", params.notice);
  if (params.error) query.set("error", params.error);
  redirect(`/attendance?${query.toString()}`);
}

const teacherManualTypes = new Set(["leave"]);
function assertManualAttendanceType(user: Awaited<ReturnType<typeof requireUser>>, type: string) {
  if (isHomeroomTeacher(user) && !teacherManualTypes.has(type)) {
    throw new Error("班主任只能手动登记请假；迟到、旷课、早退由纪律记录自动同步");
  }
}

export async function createAttendance(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireUser();
    assertModuleAccess(user, "attendance");
    const studentId = optionalNumber(formData, "studentId");
    if (!studentId) return { success: false, error: "请选择学生" };
    await assertStudentAccess(user, studentId);
    const type = textValue(formData, "type") as "normal" | "late" | "leave" | "absent" | "early_leave" | "dorm_absent";
    assertManualAttendanceType(user, type);
    await prisma.attendance.create({
      data: {
        studentId,
        date: dateValue(formData, "date"),
        type,
        period: textValue(formData, "period", false) || "",
        description: textValue(formData, "description", false),
        recorder: textValue(formData, "recorder")!,
        source: "manual"
      }
    });
    return { success: true };
  } catch (error) {
    console.error("createAttendance error:", error);
    return { success: false, error: "新增考勤失败：" + actionErrorMessage(error) };
  }
}

export async function deleteAttendance(id: number) {
  try {
    const user = await requireUser();
    assertModuleAccess(user, "attendance");
    const record = await prisma.attendance.findUnique({ where: { id }, select: { studentId: true } });
    if (!record) throw new Error("记录不存在");
    await assertStudentAccess(user, record.studentId);
    await prisma.attendance.delete({ where: { id } });
    revalidatePath("/attendance");
    revalidatePath("/dashboard");
    redirectToAttendance({ notice: "考勤记录已删除" });
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    console.error("deleteAttendance error:", error);
    redirectToAttendance({ error: "删除考勤失败：" + actionErrorMessage(error) });
  }
}

export async function createBatchAttendance(formData: FormData): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    const user = await requireUser();
    assertModuleAccess(user, "attendance");
    const studentIds = formData
      .getAll("studentIds")
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);

    if (studentIds.length === 0) return { success: false, error: "请至少选择一名学生" };
    await assertStudentsAccess(user, studentIds);

    const type = textValue(formData, "type") as "normal" | "late" | "leave" | "absent" | "early_leave" | "dorm_absent";
    assertManualAttendanceType(user, type);
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
        recorder,
        source: "manual"
      }))
    });

    revalidatePath("/attendance");
    revalidatePath("/dashboard");
    return { success: true, count: studentIds.length };
  } catch (error) {
    console.error("createBatchAttendance error:", error);
    return { success: false, error: "批量录入失败：" + actionErrorMessage(error) };
  }
}
