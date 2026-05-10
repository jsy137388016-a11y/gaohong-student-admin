"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionErrorMessage, actionUrl, isNextRedirectError } from "@/lib/action-utils";
import { assertModuleAccess, assertStudentAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { optionalNumber, textValue } from "@/lib/forms";
import { requireUser } from "@/lib/auth";

export async function createStudent(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireUser();
    assertModuleAccess(user, "students");
    await prisma.student.create({
      data: {
        name: textValue(formData, "name")!,
        gender: textValue(formData, "gender") as "male" | "female",
        grade: textValue(formData, "grade")!,
        phone: textValue(formData, "phone", false),
        parentName: textValue(formData, "parentName")!,
        parentPhone: textValue(formData, "parentPhone")!,
        boardingStatus: textValue(formData, "boardingStatus") as "boarding" | "day_student",
        artMajor: textValue(formData, "artMajor", false),
        remark: textValue(formData, "remark", false),
        classId: optionalNumber(formData, "classId")
      }
    });
    return { success: true };
  } catch (error) {
    console.error("createStudent error:", error);
    return { success: false, error: "创建学生失败：" + actionErrorMessage(error) };
  }
}

export async function updateStudent(id: number, formData: FormData) {
  try {
    const user = await requireUser();
    assertModuleAccess(user, "students");
    await assertStudentAccess(user, id);
    await prisma.student.update({
      where: { id },
      data: {
        name: textValue(formData, "name")!,
        gender: textValue(formData, "gender") as "male" | "female",
        grade: textValue(formData, "grade")!,
        phone: textValue(formData, "phone", false),
        parentName: textValue(formData, "parentName")!,
        parentPhone: textValue(formData, "parentPhone")!,
        boardingStatus: textValue(formData, "boardingStatus") as "boarding" | "day_student",
        artMajor: textValue(formData, "artMajor", false),
        remark: textValue(formData, "remark", false),
        classId: optionalNumber(formData, "classId")
      }
    });
    revalidatePath("/students");
    redirect(actionUrl("/students", { notice: "学生信息已更新" }));
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    console.error("updateStudent error:", error);
    throw new Error("更新学生失败：" + actionErrorMessage(error));
  }
}

/**
 * 删除学生（软删除）：status = 'deleted'，classId = null
 * 不物理删除学生，保留历史数据
 */
export async function deleteStudent(id: number) {
  try {
    const user = await requireUser();
    assertModuleAccess(user, "students");
    await assertStudentAccess(user, id);
    await prisma.student.update({
      where: { id },
      data: {
        status: "deleted",
        classId: null
      }
    });
    revalidatePath("/students");
    revalidatePath("/focus");
    redirect(actionUrl("/students", { notice: "学生已删除" }));
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    console.error("deleteStudent error:", error);
    throw new Error("删除学生失败：" + actionErrorMessage(error));
  }
}

async function requireStudentAccess(studentId: number) {
  const user = await requireUser();
  assertModuleAccess(user, "students");
  await assertStudentAccess(user, studentId);
  return user;
}

export async function markFocusStudent(id: number, formData: FormData) {
  const user = await requireStudentAccess(id);
  const focusNote = textValue(formData, "focusNote")!;

  await prisma.student.update({
    where: { id },
    data: {
      isFocus: true,
      focusNote,
      focusMarkedBy: user.name,
      focusMarkedAt: new Date()
    }
  });

  revalidatePath(`/students/${id}`);
  revalidatePath("/students");
  revalidatePath("/focus");
}

export async function clearFocusStudent(id: number) {
  await requireStudentAccess(id);
  await prisma.student.update({
    where: { id },
    data: {
      isFocus: false,
      focusNote: null,
      focusMarkedBy: null,
      focusMarkedAt: null
    }
  });

  revalidatePath(`/students/${id}`);
  revalidatePath("/students");
  revalidatePath("/focus");
}
