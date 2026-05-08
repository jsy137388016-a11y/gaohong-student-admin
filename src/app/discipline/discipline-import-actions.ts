"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { syncAttendanceFromDiscipline } from "@/lib/discipline-sync";
import { assertStudentsAccess, requireModuleAccess, studentWhereForUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export interface DisciplineImportRow {
  rowNo: number;
  studentNo: string;
  studentName: string;
  className: string;
  date: string;
  violationType: string;
  description: string;
  deductScore: number | null;
  result: string;
  remark: string;
}

export interface DisciplinePreviewRow extends DisciplineImportRow {
  status: "ok" | "error";
  errorReason: string;
  warningReason: string;
  matchedStudentId: number | null;
  matchedStudentName: string | null;
}

export interface DisciplinePreviewResult {
  totalRows: number;
  okRows: number;
  errorRows: number;
  syncRows: number;
  rows: DisciplinePreviewRow[];
}

export interface DisciplineImportResult {
  success: boolean;
  message: string;
  imported: number;
  failed: number;
  attendanceSynced: number;
  attendanceSkipped: number;
}

const SYNC_TYPES = new Set(["迟到", "旷课", "早退"]);

export async function validateDisciplineImport(rawRows: DisciplineImportRow[]): Promise<DisciplinePreviewResult> {
  const user = await requireUser();
  requireModuleAccess(user, "discipline");

  let students: any[] = [];
  try {
    students = await prisma.student.findMany({
      where: studentWhereForUser(user, { status: "active" }),
      include: { classRoom: true }
    });
  } catch {
    students = await prisma.student.findMany({
      where: studentWhereForUser(user),
      include: { classRoom: true }
    });
    students = students.filter((s: any) => s.status !== "withdrawn" && s.status !== "inactive" && s.status !== "deleted");
  }

  const rows: DisciplinePreviewRow[] = [];
  let okRows = 0;
  let errorRows = 0;
  let syncRows = 0;

  for (const row of rawRows) {
    const errors: string[] = [];
    const warnings: string[] = [];
    const violationType = row.violationType?.trim();

    if (!row.studentName?.trim() && !row.studentNo?.trim()) errors.push("学号和学生姓名至少填写一项");
    if (!row.date?.trim()) errors.push("日期为空");
    if (!violationType) errors.push("类型为空");
    const recordedAt = parseImportDate(row.date);
    if (row.date && !recordedAt) errors.push("日期格式不正确");
    if (row.deductScore !== null && (!Number.isFinite(row.deductScore) || row.deductScore < 0)) errors.push("扣分必须是非负数字");

    const matched = matchStudent(row, students);
    if (!matched) errors.push("未匹配到学生，请检查学号/姓名/班级");
    if (violationType && SYNC_TYPES.has(violationType)) warnings.push("该类型会自动同步到考勤管理");

    if (errors.length > 0) {
      rows.push({ ...row, status: "error", errorReason: errors.join("；"), warningReason: warnings.join("；"), matchedStudentId: matched?.id ?? null, matchedStudentName: matched?.name ?? null });
      errorRows++;
      continue;
    }

    rows.push({ ...row, status: "ok", errorReason: "", warningReason: warnings.join("；"), matchedStudentId: matched.id, matchedStudentName: matched.name });
    okRows++;
    if (violationType && SYNC_TYPES.has(violationType)) syncRows++;
  }

  return { totalRows: rawRows.length, okRows, errorRows, syncRows, rows };
}

export async function confirmDisciplineImport(rows: DisciplinePreviewRow[]): Promise<DisciplineImportResult> {
  const user = await requireUser();
  requireModuleAccess(user, "discipline");
  const importableRows = rows.filter((row) => row.status === "ok" && row.matchedStudentId);

  if (importableRows.length === 0) {
    return { success: false, message: "没有可导入的数据", imported: 0, failed: 0, attendanceSynced: 0, attendanceSkipped: 0 };
  }

  await assertStudentsAccess(user, importableRows.map((row) => row.matchedStudentId!));

  let imported = 0;
  let failed = 0;
  let attendanceSynced = 0;
  let attendanceSkipped = 0;

  for (const row of importableRows) {
    try {
      const recordedAt = parseImportDate(row.date);
      if (!recordedAt || !row.matchedStudentId) throw new Error("导入行缺少学生或日期");
      const violationType = row.violationType.trim();
      const description = row.description?.trim() || violationType;
      const follower = user.name || "批量导入";

      await prisma.discipline.create({
        data: {
          studentId: row.matchedStudentId,
          violationType,
          description,
          result: row.result?.trim() || "",
          deductScore: row.deductScore ?? 0,
          parentNotified: false,
          follower,
          remark: row.remark?.trim() || null,
          recordedAt
        }
      });
      imported++;

      const sync = await syncAttendanceFromDiscipline({
        studentId: row.matchedStudentId,
        violationType,
        recordedAt,
        description,
        recorder: follower
      });
      if (sync.synced) attendanceSynced++;
      else if (sync.reason === "duplicate") attendanceSkipped++;
    } catch (e: any) {
      console.error("导入纪律记录失败:", e?.message || e);
      failed++;
    }
  }

  revalidatePath("/discipline");
  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  revalidatePath("/students");

  const parts = [`成功导入 ${imported} 条纪律记录`];
  if (attendanceSynced > 0) parts.push(`同步生成 ${attendanceSynced} 条考勤`);
  if (attendanceSkipped > 0) parts.push(`跳过 ${attendanceSkipped} 条重复考勤`);
  if (failed > 0) parts.push(`失败 ${failed} 条`);

  return { success: failed === 0, message: parts.join("，"), imported, failed, attendanceSynced, attendanceSkipped };
}

function parseImportDate(value: string) {
  const text = String(value || "").trim();
  if (!text) return null;
  const normalized = text.includes("T") ? text : text.includes(" ") ? text.replace(" ", "T") : `${text}T00:00:00`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function matchStudent(row: DisciplineImportRow, students: any[]) {
  const studentNo = row.studentNo?.trim();
  const name = row.studentName?.trim();
  const className = row.className?.trim();

  if (studentNo) {
    const byNo = students.find((student) => student.studentNo && student.studentNo.trim() === studentNo);
    if (byNo) return byNo;
  }

  if (!name) return null;
  const nameMatches = students.filter((student) => student.name?.trim() === name);
  if (className) {
    const classMatches = nameMatches.filter((student) => student.classRoom?.name?.trim() === className || `${student.classRoom?.grade || ""} ${student.classRoom?.name || ""}`.trim() === className);
    if (classMatches.length === 1) return classMatches[0];
    if (classMatches.length > 1) return null;
  }
  if (nameMatches.length === 1) return nameMatches[0];
  return null;
}
