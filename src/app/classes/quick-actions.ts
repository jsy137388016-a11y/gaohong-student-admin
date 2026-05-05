"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { dateValue, numberValue, optionalNumber, textValue } from "@/lib/forms";
import { prisma } from "@/lib/prisma";

// ==================== 违纪登记 ====================
export async function quickCreateDiscipline(formData: FormData) {
  try {
    await requireUser();
    const studentId = optionalNumber(formData, "studentId");
    if (!studentId) throw new Error("学生ID不能为空");

    await prisma.discipline.create({
      data: {
        studentId,
        violationType: textValue(formData, "violationType")!,
        description: textValue(formData, "description")!,
        result: textValue(formData, "result")!,
        parentNotified: formData.get("parentNotified") === "on",
        follower: textValue(formData, "follower")!,
        remark: textValue(formData, "remark", false),
        recordedAt: dateValue(formData, "recordedAt")
      }
    });

    revalidatePath("/discipline");
    revalidatePath("/dashboard");
    return { success: true, message: "违纪记录已保存" };
  } catch (error) {
    console.error("quickCreateDiscipline error:", error);
    return { success: false, message: "违纪登记失败：" + (error instanceof Error ? error.message : "未知错误") };
  }
}

// ==================== 考勤登记 ====================
export async function quickCreateAttendance(formData: FormData) {
  try {
    await requireUser();
    const studentId = optionalNumber(formData, "studentId");
    if (!studentId) throw new Error("学生ID不能为空");

    const type = textValue(formData, "type")!;

    await prisma.attendance.create({
      data: {
        studentId,
        date: dateValue(formData, "date"),
        type: type as "normal" | "late" | "leave" | "absent" | "early_leave" | "dorm_absent",
        period: textValue(formData, "period") || "",
        description: textValue(formData, "description", false),
        recorder: textValue(formData, "recorder")!
      }
    });

    revalidatePath("/attendance");
    revalidatePath("/dashboard");
    return { success: true, message: "考勤记录已保存" };
  } catch (error) {
    console.error("quickCreateAttendance error:", error);
    return { success: false, message: "考勤登记失败：" + (error instanceof Error ? error.message : "未知错误") };
  }
}

// ==================== 请假登记 ====================
export async function quickCreateLeave(formData: FormData) {
  try {
    await requireUser();
    const studentId = optionalNumber(formData, "studentId");
    if (!studentId) throw new Error("学生ID不能为空");

    await prisma.attendance.create({
      data: {
        studentId,
        date: dateValue(formData, "leaveStart"),
        type: "leave" as const,
        period: "",
        leaveType: textValue(formData, "leaveType")!,
        leaveStart: dateValue(formData, "leaveStart"),
        leaveEnd: dateValue(formData, "leaveEnd"),
        parentConfirmed: formData.get("parentConfirmed") === "on",
        approvalStatus: textValue(formData, "approvalStatus") || "pending",
        approver: textValue(formData, "approver", false),
        description: textValue(formData, "leaveReason", false),
        recorder: textValue(formData, "recorder")!
      }
    });

    revalidatePath("/attendance");
    revalidatePath("/dashboard");
    return { success: true, message: "请假记录已保存" };
  } catch (error) {
    console.error("quickCreateLeave error:", error);
    return { success: false, message: "请假登记失败：" + (error instanceof Error ? error.message : "未知错误") };
  }
}

// ==================== 成绩登记 ====================
export async function quickCreateScore(formData: FormData) {
  try {
    await requireUser();
    const studentId = optionalNumber(formData, "studentId");
    if (!studentId) throw new Error("学生ID不能为空");

    const examName = textValue(formData, "examName")!;
    const examDate = dateValue(formData, "examDate");
    const grade = textValue(formData, "grade") || "";

    // 查找或创建考试
    let exam: any = null;
    try {
      const exams = await prisma.exam.findMany({ where: { name: examName } });
      exam = exams.find((e: any) => e.name === examName);
    } catch { /* ignore */ }

    if (!exam) {
      exam = await prisma.exam.create({
        data: {
          name: examName,
          examDate,
          grade,
          remark: textValue(formData, "remark", false)
        }
      });
    }

    const examId = exam.id;

    // 获取学生班级
    let classId: number | null = null;
    try {
      const student = await prisma.student.findUnique({ where: { id: studentId } });
      classId = student?.classId ?? null;
    } catch { /* ignore */ }

    // 满分映射
    const fullScoreMap: Record<string, number> = {
      "语文": 150, "数学": 150, "英语": 150, "日语": 150, "俄语": 150,
      "物理": 100, "历史": 100, "地理": 100, "政治": 100, "生物": 100, "化学": 100,
    };

    // subject 模式：逐科写入 Score
    const subjectFields: Array<{ key: string; label: string }> = [
      { key: "chinese", label: "语文" },
      { key: "math", label: "数学" },
      { key: "english", label: "英语" },
      { key: "japanese", label: "日语" },
      { key: "russian", label: "俄语" },
      { key: "physics", label: "物理" },
      { key: "history", label: "历史" },
      { key: "geography", label: "地理" },
      { key: "politics", label: "政治" },
      { key: "biology", label: "生物" },
      { key: "chemistry", label: "化学" },
    ];

    let savedCount = 0;
    for (const { key, label } of subjectFields) {
      const val = optionalNumber(formData, key);
      if (val === null || val === undefined) continue;

      const fullScore = fullScoreMap[label] || 100;

      // 检查已有成绩
      let existing: any = null;
      try {
        existing = await prisma.score.findFirst({
          where: { examId, studentId, subject: label }
        });
      } catch { /* ignore */ }

      if (existing) {
        await prisma.score.update({
          where: { id: existing.id },
          data: { score: val, fullScore, classId }
        });
      } else {
        await prisma.score.create({
          data: { examId, studentId, classId, subject: label, score: val, fullScore }
        });
      }
      savedCount++;
    }

    revalidatePath("/exams");
    revalidatePath(`/exams/${examId}`);
    revalidatePath("/dashboard");
    return { success: true, message: savedCount > 0 ? `${savedCount} 科成绩已保存` : "未填写任何成绩" };
  } catch (error) {
    console.error("quickCreateScore error:", error);
    return { success: false, message: "成绩登记失败：" + (error instanceof Error ? error.message : "未知错误") };
  }
}

// ==================== 沟通记录 ====================
export async function quickCreateCommunication(formData: FormData) {
  try {
    await requireUser();
    const studentId = optionalNumber(formData, "studentId");
    if (!studentId) throw new Error("学生ID不能为空");

    await prisma.communication.create({
      data: {
        studentId,
        target: textValue(formData, "target")!,
        method: textValue(formData, "method") as "phone" | "wechat" | "onsite" | "message" | "other",
        content: textValue(formData, "content")!,
        parentFeedback: textValue(formData, "parentFeedback", false),
        followUp: textValue(formData, "followUp", false),
        communicator: textValue(formData, "communicator")!,
        contactedAt: dateValue(formData, "contactedAt"),
        remark: textValue(formData, "remark", false)
      }
    });

    revalidatePath("/communications");
    revalidatePath("/dashboard");
    return { success: true, message: "沟通记录已保存" };
  } catch (error) {
    console.error("quickCreateCommunication error:", error);
    return { success: false, message: "沟通记录登记失败：" + (error instanceof Error ? error.message : "未知错误") };
  }
}

// ==================== 口碑预警 ====================
export async function quickCreateWarning(formData: FormData) {
  try {
    await requireUser();
    const studentId = optionalNumber(formData, "studentId");
    if (!studentId) throw new Error("学生ID不能为空");

    await prisma.warningRecord.create({
      data: {
        studentId,
        level: textValue(formData, "level")!,
        warningType: textValue(formData, "warningType")!,
        reason: textValue(formData, "reason")!,
        currentMeasure: textValue(formData, "currentMeasure", false),
        responsiblePerson: textValue(formData, "responsiblePerson", false),
        nextFollowUpAt: formData.get("nextFollowUpAt") ? dateValue(formData, "nextFollowUpAt") : null,
        status: textValue(formData, "status") || "pending",
        remark: textValue(formData, "remark", false)
      }
    });

    // 同时把学生标记为重点关注
    await prisma.student.update({
      where: { id: studentId },
      data: {
        isFocus: true,
        focusNote: textValue(formData, "reason")!,
        focusMarkedBy: textValue(formData, "responsiblePerson", false),
        focusMarkedAt: new Date()
      }
    });

    revalidatePath("/focus");
    revalidatePath("/dashboard");
    return { success: true, message: "预警记录已保存，学生已加入重点关注" };
  } catch (error) {
    console.error("quickCreateWarning error:", error);
    return { success: false, message: "口碑预警登记失败：" + (error instanceof Error ? error.message : "未知错误") };
  }
}
