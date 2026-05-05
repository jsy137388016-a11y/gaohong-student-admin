"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { optionalNumber, textValue } from "@/lib/forms";
import { requireUser } from "@/lib/auth";

export async function createStudent(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    await requireUser();
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
    return { success: false, error: "创建学生失败：" + (error instanceof Error ? error.message : "未知错误") };
  }
}

export async function updateStudent(id: number, formData: FormData) {
  try {
    await requireUser();
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
    redirect("/students");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    console.error("updateStudent error:", error);
    throw new Error("更新学生失败：" + (error instanceof Error ? error.message : "未知错误"));
  }
}

/**
 * 删除学生（软删除）：status = 'deleted'，classId = null
 * 不物理删除学生，保留历史数据
 */
export async function deleteStudent(id: number) {
  try {
    await requireUser();
    await prisma.student.update({
      where: { id },
      data: {
        status: "deleted",
        classId: null
      }
    });
    revalidatePath("/students");
    revalidatePath("/focus");
  } catch (error) {
    console.error("deleteStudent error:", error);
    throw new Error("删除学生失败：" + (error instanceof Error ? error.message : "未知错误"));
  }
}

async function requireStudentAccess(studentId: number) {
  const user = await requireUser();
  if (user.role !== "head_teacher") return user;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { classRoom: true }
  });

  if (!student || student.classRoom?.headTeacher !== user.name) {
    throw new Error("无权操作该学生");
  }

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
