"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { dateValue, textValue } from "@/lib/forms";
import { prisma } from "@/lib/prisma";

export async function createExam(formData: FormData) {
  try {
    await requireUser();
    await prisma.exam.create({
      data: {
        name: textValue(formData, "name")!,
        examDate: dateValue(formData, "examDate"),
        grade: textValue(formData, "grade")!,
        type: textValue(formData, "type", false) || "月考",
        remark: textValue(formData, "remark", false)
      }
    });
    revalidatePath("/exams");
    revalidatePath("/dashboard");
    redirect("/exams?notice=考试已新增");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    console.error("createExam error:", error);
    throw new Error("创建考试失败：" + (error instanceof Error ? error.message : "未知错误"));
  }
}

export async function deleteExam(id: number) {
  try {
    await requireUser();
    await prisma.exam.delete({ where: { id } });
    revalidatePath("/exams");
    revalidatePath("/dashboard");
    redirect("/exams?notice=考试已删除");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    console.error("deleteExam error:", error);
    throw new Error("删除考试失败：" + (error instanceof Error ? error.message : "未知错误"));
  }
}

export async function deleteScore(scoreId: number, examId: number) {
  try {
    await requireUser();
    await prisma.score.delete({ where: { id: scoreId } });
    revalidatePath(`/exams/${examId}`);
    redirect(`/exams/${examId}?notice=成绩已删除`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    console.error("deleteScore error:", error);
    throw new Error("删除成绩失败：" + (error instanceof Error ? error.message : "未知错误"));
  }
}
