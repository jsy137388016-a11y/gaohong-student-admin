"use server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ====== 类型定义 ======

/** Excel 中一行数据 */
export interface ScoreImportRow {
  rowNo: number;
  className: string;
  name: string;
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

/** 校验后预览行 */
export interface ScorePreviewRow extends ScoreImportRow {
  status: "ok" | "error" | "warning";
  errorReason: string;
  warningReason: string;
  matchedStudentId: number | null;
  matchedStudentName: string | null;
}

/** 校验结果 */
export interface ScorePreviewResult {
  totalRows: number;
  matchedStudents: number;
  importableStudents: number;
  importableScores: number;
  errorRows: number;
  warningRows: number;
  duplicateScores: number;
  rows: ScorePreviewRow[];
}

/** 导入结果 */
export interface ScoreImportResult {
  success: boolean;
  message: string;
  importedStudents: number;
  importedScores: number;
  updatedScores: number;
  skippedErrors: number;
  warningRows: number;
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

// ====== 获取班级学生列表（用于模板下载） ======

export async function getClassStudents(classId: number) {
  await requireUser();
  try {
    const classRoom = await prisma.classRoom.findUnique({
      where: { id: classId, status: "active" },
    });
    if (!classRoom) return { success: false as const, message: "班级不存在或已停用" };

    const students = await prisma.student.findMany({
      where: { classId, status: "active" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true },
    });

    return {
      success: true as const,
      className: classRoom.name,
      grade: classRoom.grade,
      students: students.map((s: any) => ({
        id: s.id,
        name: s.name,
        phone: s.phone || "",
      })),
    };
  } catch (e: any) {
    return { success: false as const, message: "查询班级学生失败：" + (e?.message || "未知错误") };
  }
}

// ====== 获取考试列表（用于选择考试批次） ======

export async function getExams(grade?: string) {
  await requireUser();
  try {
    const where = grade ? { grade } : {};
    const exams = await prisma.exam.findMany({
      where,
      orderBy: { examDate: "desc" },
      select: { id: true, name: true, examDate: true, grade: true, type: true },
    });
    return exams.map((e: any) => ({
      id: e.id,
      name: e.name,
      examDate: e.examDate instanceof Date ? e.examDate.toISOString().slice(0, 10) : String(e.examDate || "").slice(0, 10),
      grade: e.grade,
      type: e.type || "月考",
    }));
  } catch {
    return [];
  }
}

// ====== 快速创建考试 ======

export async function createExamQuick(data: {
  name: string;
  examDate: string;
  type: string;
  grade: string;
  remark?: string;
}) {
  await requireUser();
  try {
    const exam = await prisma.exam.create({
      data: {
        name: data.name,
        examDate: new Date(data.examDate),
        grade: data.grade,
        type: data.type || "月考",
        remark: data.remark || null,
      },
    });
    return {
      success: true as const,
      id: exam.id,
      name: exam.name,
    };
  } catch (e: any) {
    return { success: false as const, message: "创建考试失败：" + (e?.message || "未知错误") };
  }
}

// ====== 校验导入数据 ======

export async function validateScoreImport(
  classId: number,
  examId: number,
  rawRows: ScoreImportRow[]
): Promise<ScorePreviewResult> {
  await requireUser();

  // 1. 检查班级和考试
  let classRoom: any = null;
  let exam: any = null;
  try {
    [classRoom, exam] = await Promise.all([
      prisma.classRoom.findUnique({ where: { id: classId } }),
      prisma.exam.findUnique({ where: { id: examId } }),
    ]);
  } catch {
    throw new Error("查询班级或考试信息失败");
  }
  if (!classRoom) throw new Error("班级不存在");
  if (!exam) throw new Error("考试不存在");

  // 2. 查询当前班级学生
  let classStudents: any[] = [];
  try {
    classStudents = await prisma.student.findMany({
      where: { classId, status: "active" },
    });
  } catch {
    try {
      classStudents = await prisma.student.findMany({ where: { classId } });
      classStudents = classStudents.filter((s: any) => s.status !== "withdrawn" && s.status !== "inactive" && s.status !== "deleted");
    } catch {
      classStudents = [];
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

  // 4. 逐行校验
  const rows: ScorePreviewRow[] = [];
  let matchedStudents = 0;
  let importableStudents = 0;
  let importableScores = 0;
  let errorRows = 0;
  let warningRows = 0;
  let duplicateScores = 0;

  for (const row of rawRows) {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 4a. 姓名为空
    if (!row.name || !row.name.trim()) {
      rows.push({
        ...row,
        status: "error",
        errorReason: "姓名为空",
        warningReason: "",
        matchedStudentId: null,
        matchedStudentName: null,
      });
      errorRows++;
      continue;
    }

    // 4b. 分数校验
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

    // 4c. 外语规则
    const foreignFilled = FOREIGN_SUBJECTS.filter((s) => row[s] !== null && row[s] !== undefined);
    if (foreignFilled.length >= 2) {
      errors.push("外语科目只能填写一项");
    } else if (foreignFilled.length === 0) {
      // 外语都没填
      if (filledSubjects.length > 0) {
        warnings.push("外语未填写");
      }
    }

    // 4d. 物理/历史规则
    const preferredFilled = PREFERRED_SUBJECTS.filter((s) => row[s] !== null && row[s] !== undefined);
    if (preferredFilled.length === 0) {
      if (filledSubjects.length > 0) {
        warnings.push("首选科目未填写");
      }
    } else if (preferredFilled.length === 2) {
      warnings.push("物理和历史同时有成绩，请确认是否特殊情况");
    }

    // 4e. 再选科目规则
    const electiveFilled = ELECTIVE_SUBJECTS.filter((s) => row[s] !== null && row[s] !== undefined);
    if (electiveFilled.length === 0) {
      if (filledSubjects.length > 0) {
        warnings.push("再选科目未填写");
      }
    } else if (electiveFilled.length === 1) {
      warnings.push("再选科目不足两科");
    } else if (electiveFilled.length >= 3) {
      warnings.push("再选科目超过两科，请确认");
    }

    // 4f. 全科为空
    if (!hasAnyScore) {
      warnings.push("该学生未填写任何成绩");
    }

    // 4g. 匹配学生（只匹配当前班级）
    const matched = matchClassStudent(row, classStudents, classRoom.name);
    if (!matched) {
      const allErrors = errors.join("；");
      rows.push({
        ...row,
        status: "error",
        errorReason: allErrors ? allErrors + "；当前班级内未找到该学生" : "当前班级内未找到该学生",
        warningReason: "",
        matchedStudentId: null,
        matchedStudentName: null,
      });
      errorRows++;
      continue;
    }

    // 如果有错误（分数超限等），标记为错误
    if (errors.length > 0) {
      rows.push({
        ...row,
        status: "error",
        errorReason: errors.join("；"),
        warningReason: "",
        matchedStudentId: matched.id,
        matchedStudentName: matched.name,
      });
      errorRows++;
      continue;
    }

    // 计算可导入成绩条数和重复数
    let rowScoreCount = 0;
    let rowDuplicateCount = 0;
    for (const subj of filledSubjects) {
      rowScoreCount++;
      if (existingScoreSet.has(`${matched.id}__${SUBJECT_LABELS[subj]}`)) {
        rowDuplicateCount++;
      }
    }

    matchedStudents++;
    importableScores += rowScoreCount;
    duplicateScores += rowDuplicateCount;
    importableStudents++;

    // 确定状态：有警告为warning，否则为ok
    const hasWarning = warnings.length > 0;
    if (hasWarning) warningRows++;

    rows.push({
      ...row,
      status: hasWarning ? "warning" : "ok",
      errorReason: "",
      warningReason: warnings.join("；"),
      matchedStudentId: matched.id,
      matchedStudentName: matched.name,
    });
  }

  return {
    totalRows: rawRows.length,
    matchedStudents,
    importableStudents,
    importableScores,
    errorRows,
    warningRows,
    duplicateScores,
    rows,
  };
}

// ====== 确认导入 ======

export async function confirmScoreImport(
  classId: number,
  examId: number,
  rows: ScorePreviewRow[]
): Promise<ScoreImportResult> {
  await requireUser();

  // 只导入 status=ok 或 status=warning 的行
  const importableRows = rows.filter((r) => r.status === "ok" || r.status === "warning");
  if (importableRows.length === 0) {
    return {
      success: false,
      message: "没有可导入的数据",
      importedStudents: 0,
      importedScores: 0,
      updatedScores: 0,
      skippedErrors: 0,
      warningRows: 0,
    };
  }

  let importedStudents = 0;
  let importedScores = 0;
  let updatedScores = 0;
  let skippedErrors = 0;
  let warningRows = 0;

  for (const row of importableRows) {
    if (!row.matchedStudentId) {
      skippedErrors++;
      continue;
    }

    let studentScoreCount = 0;

    for (const subj of SUBJECT_KEYS) {
      const val = row[subj];
      if (val === null || val === undefined) continue; // 空值不写入
      if (typeof val !== "number" || !Number.isFinite(val)) continue;

      const subjectName = SUBJECT_LABELS[subj];
      const fullScore = FULL_SCORES[subj];

      try {
        // 尝试 upsert：存在则更新，不存在则创建
        const existing = await prisma.score.findFirst({
          where: {
            examId,
            studentId: row.matchedStudentId,
            subject: subjectName,
          },
        });

        if (existing) {
          await prisma.score.update({
            where: { id: existing.id },
            data: {
              score: val,
              fullScore,
              classId,
              remark: row.remark || null,
            },
          });
          updatedScores++;
        } else {
          await prisma.score.create({
            data: {
              examId,
              studentId: row.matchedStudentId,
              classId,
              subject: subjectName,
              score: val,
              fullScore,
              remark: row.remark || null,
            },
          });
          importedScores++;
        }
        studentScoreCount++;
      } catch (e: any) {
        console.error(`写入成绩失败: student=${row.matchedStudentId}, subject=${subjectName}`, e?.message || e);
      }
    }

    if (studentScoreCount > 0) {
      importedStudents++;
    }
    if (row.status === "warning") warningRows++;
  }

  const parts: string[] = [];
  if (importedStudents > 0) parts.push(`成功导入 ${importedStudents} 名学生成绩`);
  if (importedScores > 0) parts.push(`新增 ${importedScores} 条成绩`);
  if (updatedScores > 0) parts.push(`覆盖 ${updatedScores} 条成绩`);
  if (skippedErrors > 0) parts.push(`跳过 ${skippedErrors} 条错误`);
  if (warningRows > 0) parts.push(`${warningRows} 行有警告`);

  return {
    success: true,
    message: parts.join("，") || "导入完成",
    importedStudents,
    importedScores,
    updatedScores,
    skippedErrors,
    warningRows,
  };
}

// ====== 辅助函数 ======

function matchClassStudent(row: ScoreImportRow, classStudents: any[], className: string): any | null {
  const name = row.name?.trim() || "";
  const phone = row.phone?.trim() || "";

  if (!name) return null;

  // 1. 手机号匹配
  if (phone) {
    const byPhone = classStudents.filter((s: any) => s.phone && s.phone.trim() === phone);
    if (byPhone.length === 1) return byPhone[0];
    if (byPhone.length > 1) {
      // 手机号匹配到多人，再按姓名筛选
      const byName = byPhone.filter((s: any) => s.name && s.name.trim() === name);
      if (byName.length === 1) return byName[0];
      return null;
    }
  }

  // 2. 当前班级+姓名匹配
  const byName = classStudents.filter((s: any) => s.name && s.name.trim() === name);
  if (byName.length === 1) return byName[0];
  if (byName.length > 1) {
    // 同班同名，看手机号能否区分
    if (phone) {
      const byNameAndPhone = byName.filter((s: any) => s.phone && s.phone.trim() === phone);
      if (byNameAndPhone.length === 1) return byNameAndPhone[0];
    }
    return null;
  }

  return null;
}
