"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { numberValue, textValue } from "@/lib/forms";
import { prisma } from "@/lib/prisma";

/** 从学生详情页快速新增违纪记录 */
export async function createDisciplineFromStudent(studentId: number, formData: FormData) {
  await requireUser();

  // 手动校验必填字段，返回中文友好提示
  const violationType = textValue(formData, "violationType");
  if (!violationType) {
    return { success: false as const, message: "请填写违纪类型" };
  }
  const recordedAtRaw = formData.get("recordedAt") as string | null;
  if (!recordedAtRaw) {
    return { success: false as const, message: "请填写违纪时间" };
  }

  try {
    const description = textValue(formData, "description", false) ?? "";
    const result = textValue(formData, "result", false) ?? "";
    const deductScore = numberValue(formData, "deductScore", 0);
    if (deductScore < 0) {
      return { success: false as const, message: "扣分不能为负数" };
    }
    const follower = textValue(formData, "follower", false) ?? "";
    const remark = textValue(formData, "remark", false) ?? "";
    const parentNotified = formData.get("parentNotified") === "on";
    const recordedAt = new Date(recordedAtRaw);

    await prisma.discipline.create({
      data: {
        studentId,
        violationType,
        description,
        result,
        deductScore,
        parentNotified,
        follower,
        remark,
        recordedAt,
      },
    });

    revalidatePath(`/students/${studentId}`);
    return { success: true as const, message: "违纪记录已添加" };
  } catch (e: any) {
    return { success: false as const, message: "添加违纪记录失败：" + (e?.message || "未知错误") };
  }
}

/** 删除学生的违纪记录 */
export async function deleteStudentDiscipline(disciplineId: number, studentId: number) {
  console.log("[DELETE] 进入 action, disciplineId=", disciplineId, "studentId=", studentId);

  const user = await requireUser();
  console.log("[DELETE] user=", user?.id, user?.role);

  // 权限检查：只允许 admin 删除（第一版）
  if (user.role !== "admin") {
    console.log("[DELETE] 权限不足");
    return { success: false as const, message: "权限不足，仅管理员可删除违纪记录" };
  }

  try {
    // 验证该违纪记录属于该学生
    const discipline = await prisma.discipline.findUnique({
      where: { id: disciplineId },
      select: { studentId: true, violationType: true, deductScore: true },
    });
    console.log("[DELETE] 查询结果 discipline=", discipline);

    if (!discipline) {
      console.log("[DELETE] 违纪记录不存在");
      return { success: false as const, message: "违纪记录不存在" };
    }

    if (discipline.studentId !== studentId) {
      console.log("[DELETE] studentId 不匹配, expected=", studentId, "actual=", discipline.studentId);
      return { success: false as const, message: "无权删除该违纪记录" };
    }

    // 删除记录
    const deleteResult = await prisma.discipline.delete({
      where: { id: disciplineId },
    });
    console.log("[DELETE] delete 结果=", deleteResult);

    revalidatePath(`/students/${studentId}`);
    console.log("[DELETE] 成功完成");
    return { success: true as const, message: "违纪记录已删除" };
  } catch (e: any) {
    console.log("[DELETE] 异常=", e?.message, e);
    return { success: false as const, message: "删除失败：" + (e?.message || "未知错误") };
  }
}
