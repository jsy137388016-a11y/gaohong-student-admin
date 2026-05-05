"use server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ====== 类型定义 ======

export interface ImportRow {
  rowNo: number;
  className: string;
  studentNo: string;
  studentName: string;
  phone: string;
  chinese: number | null;
  math: number | null;
  english: number | null;
  japanese: number | null;
  russian: number | null;
  physics: number | null;
  history: number | null;
  geography: number | null;
  politics: number | null;
  biology: number | null;
  chemistry: number | null;
  remark: string;
}

export interface PreviewRow extends ImportRow {
  status: "ok" | "error" | "duplicate";
  errorReason: string;
  warningReason: string;
  matchedStudentId: number | null;
  matchedStudentName: string | null;
}

export interface PreviewResult {
  totalRows: number;
  okRows: number;
  errorRows: number;
  duplicateRows: number;
  warningRows: number;
  rows: PreviewRow[];
}

export interface ImportResult {
  success: boolean;
  message: string;
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
}

// ====== 满分配置 ======

type SubjectKey = "chinese" | "math" | "english" | "japanese" | "russian"
  | "physics" | "history" | "geography" | "politics" | "biology" | "chemistry";

const FULL_SCORES: Record<SubjectKey, number> = {
  chinese: 150, math: 150, english: 150, japanese: 150, russian: 150,
  physics: 100, history: 100, geography: 100, politics: 100, biology: 100, chemistry: 100,
};

const SUBJECT_LABELS: Record<SubjectKey, string> = {
  chinese: "语文", math: "数学", english: "英语", japanese: "日语",
  russian: "俄语", physics: "物理", history: "历史", geography: "地理",
  politics: "政治", biology: "生物", chemistry: "化学",
};

const SUBJECT_KEYS = [
  "chinese", "math", "english", "japanese", "russian",
  "physics", "history", "geography", "politics", "biology", "chemistry",
] as const;

const FOREIGN_SUBJECTS = ["english", "japanese", "russian"] as const;
const PREFERRED_SUBJECTS = ["physics", "history"] as const;
const ELECTIVE_SUBJECTS = ["chemistry", "biology", "politics", "geography"] as const;

// ====== 校验导入数据 ======

export async function validateScoreImport(examId: number, rawRows: ImportRow[]): Promise<PreviewResult> {
  await requireUser();

  // 1. 检查考试是否存在
  let exam: any = null;
  try {
    exam = await prisma.exam.findUnique({ where: { id: examId } });
  } catch {
    throw new Error("查询考试信息失败");
  }
  if (!exam) throw new Error("考试不存在");

  // 2. 查询所有学生（用于匹配）
  let allStudents: any[] = [];
  try {
    allStudents = await prisma.student.findMany({
      where: { grade: exam.grade, status: "active" },
      include: { classRoom: true }
    });
  } catch {
    try {
      allStudents = await prisma.student.findMany({
        where: { grade: exam.grade },
        include: { classRoom: true }
      });
      allStudents = allStudents.filter((s: any) => s.status !== "withdrawn" && s.status !== "inactive" && s.status !== "deleted");
    } catch {
      allStudents = [];
    }
  }

  // 3. 查询该考试已有成绩（用于重复检测）
  let existingScores: any[] = [];
  try {
    existingScores = await prisma.score.findMany({ where: { examId } });
  } catch {
    existingScores = [];
  }
  // key = "studentId__subject"
  const existingScoreSet = new Set<string>();
  for (const s of existingScores) {
    existingScoreSet.add(`${s.studentId}__${s.subject}`);
  }
  const existingStudentIds = new Set(existingScores.map((s: any) => s.studentId));

  // 4. 逐行校验
  const rows: PreviewRow[] = [];
  let okRows = 0;
  let errorRows = 0;
  let duplicateRows = 0;
  let warningRows = 0;

  for (const row of rawRows) {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 学生姓名为空
    if (!row.studentName || !row.studentName.trim()) {
      rows.push({ ...row, status: "error", errorReason: "学生姓名为空", warningReason: "", matchedStudentId: null, matchedStudentName: null });
      errorRows++;
      continue;
    }

    // 分数校验
    let hasAnyScore = false;
    const filledSubjects: SubjectKey[] = [];

    for (const subj of SUBJECT_KEYS) {
      const val = row[subj];
      if (val === null || val === undefined) continue;
      if (typeof val !== "number" || !Number.isFinite(val)) {
        errors.push(`${SUBJECT_LABELS[subj]}分数不是有效数字`);
        continue;
      }
      if (val < 0) {
        errors.push(`${SUBJECT_LABELS[subj]}分数不能为负数`);
        continue;
      }
      if (val > FULL_SCORES[subj]) {
        errors.push(`${SUBJECT_LABELS[subj]}分数超过满分 ${FULL_SCORES[subj]}`);
        continue;
      }
      hasAnyScore = true;
      filledSubjects.push(subj);
    }

    // 外语规则
    const foreignFilled = FOREIGN_SUBJECTS.filter((s) => row[s] !== null && row[s] !== undefined);
    if (foreignFilled.length >= 2) {
      errors.push("外语科目只能填写一项");
    } else if (foreignFilled.length === 0 && filledSubjects.length > 0) {
      warnings.push("外语未填写");
    }

    // 物理/历史规则
    const preferredFilled = PREFERRED_SUBJECTS.filter((s) => row[s] !== null && row[s] !== undefined);
    if (preferredFilled.length === 0 && filledSubjects.length > 0) {
      warnings.push("首选科目未填写");
    } else if (preferredFilled.length === 2) {
      warnings.push("物理和历史同时有成绩，请确认是否特殊情况");
    }

    // 再选科目规则
    const electiveFilled = ELECTIVE_SUBJECTS.filter((s) => row[s] !== null && row[s] !== undefined);
    if (electiveFilled.length === 0 && filledSubjects.length > 0) {
      warnings.push("再选科目未填写");
    } else if (electiveFilled.length === 1) {
      warnings.push("再选科目不足两科");
    } else if (electiveFilled.length >= 3) {
      warnings.push("再选科目超过两科，请确认");
    }

    // 全科为空
    if (!hasAnyScore) {
      warnings.push("该学生未填写任何成绩");
    }

    // 匹配学生
    const matched = matchStudent(row, allStudents);
    if (!matched) {
      const allErrors = errors.join("；");
      rows.push({
        ...row,
        status: "error",
        errorReason: allErrors ? allErrors + "；学生不存在" : "学生不存在",
        warningReason: "",
        matchedStudentId: null,
        matchedStudentName: null,
      });
      errorRows++;
      continue;
    }

    // 有错误则标记为错误行
    if (errors.length > 0) {
      rows.push({
        ...row,
        status: "error",
        errorReason: errors.join("；"),
        warningReason: warnings.join("；"),
        matchedStudentId: matched.id,
        matchedStudentName: matched.name,
      });
      errorRows++;
      continue;
    }

    // 检查是否有重复成绩
    const duplicateSubjects = filledSubjects.filter((subj) =>
      existingScoreSet.has(`${matched.id}__${SUBJECT_LABELS[subj]}`)
    );
    const isDuplicate = existingStudentIds.has(matched.id);

    if (isDuplicate) {
      rows.push({
        ...row,
        status: "duplicate",
        errorReason: duplicateSubjects.length > 0
          ? `${duplicateSubjects.map((s) => SUBJECT_LABELS[s]).join("、")}将覆盖已有成绩`
          : "该学生已有成绩，导入将覆盖",
        warningReason: warnings.join("；"),
        matchedStudentId: matched.id,
        matchedStudentName: matched.name,
      });
      duplicateRows++;
    } else {
      rows.push({
        ...row,
        status: "ok",
        errorReason: "",
        warningReason: warnings.join("；"),
        matchedStudentId: matched.id,
        matchedStudentName: matched.name,
      });
      okRows++;
    }

    if (warnings.length > 0) warningRows++;
  }

  return {
    totalRows: rawRows.length,
    okRows,
    errorRows,
    duplicateRows,
    warningRows,
    rows,
  };
}

// ====== 确认导入 ======

export async function confirmScoreImport(
  examId: number,
  rows: PreviewRow[],
  _duplicateMode: "overwrite" | "skip" | "fill_empty" = "overwrite"
): Promise<ImportResult> {
  await requireUser();

  const importableRows = rows.filter((r) => r.status === "ok" || r.status === "duplicate");
  if (importableRows.length === 0) {
    return { success: false, message: "没有可导入的数据", imported: 0, updated: 0, skipped: 0, failed: 0 };
  }

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of importableRows) {
    if (!row.matchedStudentId) {
      failed++;
      continue;
    }

    let studentImported = false;

    for (const subj of SUBJECT_KEYS) {
      const val = row[subj];
      if (val === null || val === undefined) continue;
      if (typeof val !== "number" || !Number.isFinite(val)) continue;

      const subjectName = SUBJECT_LABELS[subj];
      const fullScore = FULL_SCORES[subj];

      try {
        // 获取学生当前班级ID
        let studentClassId: number | null = null;
        try {
          const student = await prisma.student.findUnique({
            where: { id: row.matchedStudentId },
            select: { classId: true },
          });
          studentClassId = student?.classId ?? null;
        } catch {
          // ignore
        }
        const existing = await prisma.score.findFirst({
          where: { examId, studentId: row.matchedStudentId, subject: subjectName },
        });

        if (existing) {
          await prisma.score.update({
            where: { id: existing.id },
            data: { score: val, fullScore, classId: studentClassId, remark: row.remark || null },
          });
          updated++;
        } else {
          await prisma.score.create({
            data: {
              examId,
              studentId: row.matchedStudentId,
              classId: studentClassId,
              subject: subjectName,
              score: val,
              fullScore,
              remark: row.remark || null,
            },
          });
          imported++;
        }
        studentImported = true;
      } catch (e: any) {
        console.error("导入成绩失败:", e?.message || e);
        failed++;
      }
    }

    if (!studentImported) {
      skipped++;
    }
  }

  return {
    success: true,
    message: `导入完成：新增 ${imported} 条，更新 ${updated} 条，跳过 ${skipped} 条，失败 ${failed} 条`,
    imported,
    updated,
    skipped,
    failed,
  };
}

// ====== 辅助函数 ======

function matchStudent(row: ImportRow, students: any[]): any | null {
  const name = row.studentName?.trim() || "";
  const phone = row.phone?.trim() || "";
  const studentNo = row.studentNo?.trim() || "";
  const className = row.className?.trim() || "";

  if (!name) return null;

  // 1. 学号匹配
  if (studentNo) {
    const byNo = students.find((s: any) => s.studentNo && s.studentNo.trim() === studentNo);
    if (byNo) return byNo;
  }

  // 2. 手机号匹配
  if (phone) {
    const byPhone = students.filter((s: any) => s.phone && s.phone.trim() === phone);
    if (byPhone.length === 1) return byPhone[0];
    if (byPhone.length > 1) return null;
  }

  // 3. 班级+姓名匹配
  const nameMatches = students.filter((s: any) => s.name && s.name.trim() === name);

  if (className) {
    const classMatches = nameMatches.filter(
      (s: any) => s.classRoom && s.classRoom.name && s.classRoom.name.trim() === className
    );
    if (classMatches.length === 1) return classMatches[0];
    if (classMatches.length > 1) return null;
  }

  if (nameMatches.length === 1) return nameMatches[0];
  return null;
}
