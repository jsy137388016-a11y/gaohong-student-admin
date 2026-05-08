"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { textValue } from "@/lib/forms";
import { assertModuleAccess, assertClassAccess, assertStudentAccess, studentWhereForUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

function redirectToClasses(params: { notice?: string; error?: string }): never {
  const query = new URLSearchParams();
  if (params.notice) query.set("notice", params.notice);
  if (params.error) query.set("error", params.error);
  redirect(`/classes?${query.toString()}`);
}

export async function clearUnassignedClassGroup() {
  const user = await requireUser();
  assertModuleAccess(user, "classes");

  const count = await prisma.student.count({
    where: studentWhereForUser(user, { classId: null, status: "active" })
  });

  if (count > 0) {
    redirectToClasses({ error: "暂时不分班下还有学生，不能清空，请先为学生分配正式班级" });
  }

  const cookieStore = await cookies();
  cookieStore.set("gaohong_hide_unassigned_group", "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  });

  revalidatePath("/classes");
  redirectToClasses({ notice: "暂时不分班已清空并隐藏" });
}

export async function createClass(formData: FormData) {
  try {
    const user = await requireUser();
    assertModuleAccess(user, "classes");
    await prisma.classRoom.create({
      data: {
        name: textValue(formData, "name")!,
        grade: textValue(formData, "grade")!,
        headTeacher: textValue(formData, "headTeacher")!,
        remark: textValue(formData, "remark", false)
      }
    });
    revalidatePath("/classes");
    return { success: true as const };
  } catch (error) {
    console.error("createClass error:", error);
    return { success: false as const, error: "创建班级失败：" + (error instanceof Error ? error.message : "未知错误") };
  }
}

export async function updateClass(id: number, formData: FormData) {
  try {
    const user = await requireUser();
    assertModuleAccess(user, "classes");
    await assertClassAccess(user, id);
    await prisma.classRoom.update({
      where: { id },
      data: {
        name: textValue(formData, "name")!,
        grade: textValue(formData, "grade")!,
        headTeacher: textValue(formData, "headTeacher")!,
        remark: textValue(formData, "remark", false)
      }
    });
    revalidatePath("/classes");
    redirect("/classes?notice=班级信息已更新");
  } catch (error) {
    // redirect() throws a special error, re-throw it
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    console.error("updateClass error:", error);
    throw new Error("更新班级失败：" + (error instanceof Error ? error.message : "未知错误"));
  }
}

/**
 * 停用班级（软删除）
 * - 将班级下所有在读学生的 classId 设为 null（转入"暂不分班"）
 * - 将班级 status 设为 "inactive"，不物理删除
 * - 历史考勤、成绩、纪律、家校沟通记录全部保留
 */
export async function deactivateClass(id: number) {
  try {
    const user = await requireUser();
    assertModuleAccess(user, "classes");
    await assertClassAccess(user, id);

    // 将班级下所有学生转入暂不分班
    await prisma.student.updateMany({
      where: { classId: id },
      data: { classId: null }
    });

    // 软删除班级
    await prisma.classRoom.update({
      where: { id },
      data: { status: "inactive" }
    });

    revalidatePath("/classes");
    revalidatePath("/students");
    redirect("/classes?notice=班级已停用，学生已转入暂不分班");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    console.error("deactivateClass error:", error);
    throw new Error("停用班级失败：" + (error instanceof Error ? error.message : "未知错误"));
  }
}

// 保留 deleteClass 名称以便向后兼容（实际执行软删除）
export const deleteClass = deactivateClass;

async function requireStudentClassAccess(studentId: number) {
  const user = await requireUser();
  assertModuleAccess(user, "classes");
  await assertStudentAccess(user, studentId);
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new Error("学生不存在");
  if (student.status === "deleted") throw new Error("学生已删除");
  if (student.status === "withdrawn") throw new Error("学生已退学");
  return { user, student };
}

function classPath(classId: string) {
  return classId === "unassigned" ? "/classes/unassigned" : `/classes/${classId}`;
}

/**
 * 换班：只更新 classId
 */
export async function transferClassStudent(studentId: number, currentClassId: string, formData: FormData) {
  try {
    const { user } = await requireStudentClassAccess(studentId);
    const rawTargetClassId = String(formData.get("targetClassId") || "").trim();
    if (!rawTargetClassId) throw new Error("请选择目标班级");

    const targetClassId = rawTargetClassId === "unassigned" ? null : Number(rawTargetClassId);
    if (targetClassId !== null && !Number.isInteger(targetClassId)) throw new Error("目标班级不正确");

    if (targetClassId) {
      await assertClassAccess(user, targetClassId);
    }

    // 换班只更新 classId
    await prisma.student.update({
      where: { id: studentId },
      data: {
        classId: targetClassId
      }
    });

    revalidatePath(classPath(currentClassId));
    revalidatePath("/classes");
    revalidatePath("/students");
    redirect(`${classPath(currentClassId)}?notice=学生已换班`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    console.error("transferClassStudent error:", error);
    throw new Error("换班失败：" + (error instanceof Error ? error.message : "未知错误"));
  }
}

/**
 * 退学：status = 'withdrawn'，classId = null
 */
export async function withdrawClassStudent(studentId: number, currentClassId: string) {
  try {
    const { user, student } = await requireStudentClassAccess(studentId);
    const previousRemark = student.remark ? `${student.remark}\n` : "";
    const withdrawnNote = `${previousRemark}已退学：${new Date().toLocaleDateString("zh-CN")}，操作人：${user.name}`;

    await prisma.student.update({
      where: { id: studentId },
      data: {
        status: "withdrawn",
        classId: null,
        remark: withdrawnNote
      }
    });

    revalidatePath(classPath(currentClassId));
    revalidatePath("/classes");
    revalidatePath("/students");
    revalidatePath("/focus");
    redirect(`${classPath(currentClassId)}?notice=学生已标记退学`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    console.error("withdrawClassStudent error:", error);
    throw new Error("退学操作失败：" + (error instanceof Error ? error.message : "未知错误"));
  }
}

/**
 * 删除学生（软删除）：status = 'deleted'，classId = null
 * 不物理删除学生，保留历史数据
 */
export async function deleteClassStudent(studentId: number, currentClassId: string) {
  try {
    await requireStudentClassAccess(studentId);

    await prisma.student.update({
      where: { id: studentId },
      data: {
        status: "deleted",
        classId: null
      }
    });

    revalidatePath(classPath(currentClassId));
    revalidatePath("/classes");
    revalidatePath("/students");
    revalidatePath("/focus");
    redirect(`${classPath(currentClassId)}?notice=学生已删除`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    console.error("deleteClassStudent error:", error);
    throw new Error("删除失败：" + (error instanceof Error ? error.message : "未知错误"));
  }
}
