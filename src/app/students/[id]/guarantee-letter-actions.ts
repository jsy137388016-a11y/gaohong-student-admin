"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { textValue } from "@/lib/forms";
import { prisma } from "@/lib/prisma";

/** 创建保证书记录（方案 B：先登记元信息，文件上传预留） */
export async function createGuaranteeLetter(studentId: number, formData: FormData) {
  await requireUser();
  try {
    const fileName = textValue(formData, "fileName")!;
    const fileType = textValue(formData, "fileType", false) || "";
    const fileSize = Number(formData.get("fileSize") || 0);
    const fileUrl = textValue(formData, "fileUrl", false) || "";
    const remark = textValue(formData, "remark", false);
    const uploadedBy = textValue(formData, "uploadedBy")!;

    if (!fileName.trim()) {
      return { success: false as const, message: "文件名称不能为空" };
    }

    const letter = await prisma.guaranteeLetter.create({
      data: {
        studentId,
        fileName: fileName.trim(),
        fileType,
        fileSize: Number.isFinite(fileSize) ? fileSize : 0,
        fileUrl,
        remark,
        uploadedBy,
      },
    });

    revalidatePath(`/students/${studentId}`);
    return { success: true as const, id: letter.id, message: "保证书记录已创建" };
  } catch (e: any) {
    return { success: false as const, message: "创建保证书记录失败：" + (e?.message || "未知错误") };
  }
}

/** 删除保证书记录 */
export async function deleteGuaranteeLetter(id: number, studentId: number) {
  await requireUser();
  try {
    await prisma.guaranteeLetter.delete({ where: { id } });
    revalidatePath(`/students/${studentId}`);
    return { success: true as const, message: "已删除" };
  } catch (e: any) {
    return { success: false as const, message: "删除失败：" + (e?.message || "未知错误") };
  }
}
