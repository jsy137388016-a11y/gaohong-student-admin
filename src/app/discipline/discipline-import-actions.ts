"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { syncAttendanceFromDiscipline } from "@/lib/discipline-sync";
import { assertStudentAccess, requireModuleAccess, studentWhereForUser } from "@/lib/permissions";
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
  let accessibleStudentIds = new Set<number>();
  try {
    const [allStudents, accessibleStudents] = await Promise.all([
      prisma.student.findMany({
        where: { status: "active" },
        include: { classRoom: true }
      }),
      prisma.student.findMany({
        where: studentWhereForUser(user, { status: "active" }),
        select: { id: true }
      })
    ]);
    students = allStudents;
    accessibleStudentIds = new Set(accessibleStudents.map((student) => student.id));
  } catch {
    const [allStudents, accessibleStudents] = await Promise.all([
      prisma.student.findMany({ include: { classRoom: true } }),
      prisma.student.findMany({ where: studentWhereForUser(user), select: { id: true } })
    ]);
    students = allStudents.filter((student: any) => !["withdrawn", "inactive", "deleted"].includes(String(student.status || "")));
    accessibleStudentIds = new Set(accessibleStudents.map((student) => student.id));
  }

  const rows: DisciplinePreviewRow[] = [];
  let okRows = 0;
  let errorRows = 0;
  let syncRows = 0;

  for (const rawRow of Array.isArray(rawRows) ? rawRows : []) {
    const row = sanitizeImportRow(rawRow);
    const errors: string[] = [];
    const warnings: string[] = [];
    const violationType = row.violationType.trim();

    if (!row.studentName.trim() && !row.studentNo.trim()) errors.push("学号和学生姓名至少填写一项");
    if (!row.date.trim()) errors.push("日期为空");
    if (!violationType) errors.push("类型为空");
    const recordedAt = parseImportDate(row.date);
    if (row.date && !recordedAt) errors.push("日期格式不正确");
    if (row.deductScore === null || row.deductScore < 0) errors.push("扣分必须是非负数字");

    const matched = matchStudent(row, students);
    if (!matched) errors.push("未匹配到学生，请检查学号/姓名/班级");
    else if (!accessibleStudentIds.has(Number(matched.id))) errors.push("当前账号无权导入该学生数据");
    if (violationType && SYNC_TYPES.has(violationType)) warnings.push("该类型会自动同步到考勤管理");

    if (errors.length > 0) {
      rows.push(sanitizePreviewRow({
        row,
        status: "error",
        errorReason: errors.join("；"),
        warningReason: warnings.join("；"),
        matchedStudentId: matched?.id,
        matchedStudentName: matched?.name
      }));
      errorRows++;
      continue;
    }

    rows.push(sanitizePreviewRow({
      row,
      status: "ok",
      errorReason: "",
      warningReason: warnings.join("；"),
      matchedStudentId: matched?.id,
      matchedStudentName: matched?.name
    }));
    okRows++;
    if (SYNC_TYPES.has(violationType)) syncRows++;
  }

  return sanitizePreviewResult({ totalRows: rawRows?.length, okRows, errorRows, syncRows, rows });
}

export async function confirmDisciplineImport(rows: DisciplinePreviewRow[]): Promise<DisciplineImportResult> {
  const user = await requireUser();
  requireModuleAccess(user, "discipline");
  const cleanRows = (Array.isArray(rows) ? rows : []).map((row) => sanitizePreviewRow({ row, status: row?.status === "ok" ? "ok" : "error" }));
  const importableRows = cleanRows.filter((row) => row.status === "ok" && row.matchedStudentId !== null);

  if (importableRows.length === 0) {
    return sanitizeImportResult({ success: false, message: "没有可导入的数据", imported: 0, failed: 0, attendanceSynced: 0, attendanceSkipped: 0 });
  }

  let imported = 0;
  let failed = 0;
  let attendanceSynced = 0;
  let attendanceSkipped = 0;

  for (const row of importableRows) {
    try {
      const recordedAt = parseImportDate(row.date);
      if (!recordedAt || row.matchedStudentId === null) throw new Error("导入行缺少学生或日期");
      await assertStudentAccess(user, row.matchedStudentId);
      const violationType = row.violationType.trim();
      const description = row.description.trim() || violationType;
      const follower = String(user.name || "批量导入");

      await prisma.discipline.create({
        data: {
          studentId: row.matchedStudentId,
          violationType,
          description,
          result: row.result.trim(),
          deductScore: row.deductScore ?? 0,
          parentNotified: false,
          follower,
          remark: row.remark.trim() || null,
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
    } catch (error: unknown) {
      console.error("导入纪律记录失败:", error instanceof Error ? error.message : String(error));
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

  return sanitizeImportResult({ success: failed === 0, message: parts.join("，"), imported, failed, attendanceSynced, attendanceSkipped });
}

function parseImportDate(value: string) {
  const text = safeString(value);
  if (!text) return null;
  const normalized = text.includes("T") ? text : text.includes(" ") ? text.replace(" ", "T") : `${text}T00:00:00`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function matchStudent(row: DisciplineImportRow, students: any[]) {
  const studentNo = safeString(row.studentNo);
  const name = safeString(row.studentName);
  const className = safeString(row.className);

  if (studentNo) {
    const byNo = students.find((student) => safeString(student.studentNo) === studentNo);
    if (byNo) return byNo;
  }

  if (!name) return null;
  const nameMatches = students.filter((student) => safeString(student.name) === name);
  if (className) {
    const classMatches = nameMatches.filter((student) => {
      const simpleName = safeString(student.classRoom?.name);
      const fullName = `${safeString(student.classRoom?.grade)} ${simpleName}`.trim();
      return simpleName === className || fullName === className;
    });
    if (classMatches.length === 1) return classMatches[0];
    if (classMatches.length > 1) return null;
  }
  if (nameMatches.length === 1) return nameMatches[0];
  return null;
}

function sanitizeImportRow(row: any): DisciplineImportRow {
  return {
    rowNo: safeNumber(row?.rowNo, 0),
    studentNo: safeString(row?.studentNo),
    studentName: safeString(row?.studentName),
    className: safeString(row?.className),
    date: safeString(row?.date),
    violationType: safeString(row?.violationType),
    description: safeString(row?.description),
    deductScore: safeNullableNumber(row?.deductScore),
    result: safeString(row?.result),
    remark: safeString(row?.remark)
  };
}

function sanitizePreviewRow(input: {
  row: any;
  status?: "ok" | "error";
  errorReason?: unknown;
  warningReason?: unknown;
  matchedStudentId?: unknown;
  matchedStudentName?: unknown;
}): DisciplinePreviewRow {
  const row = sanitizeImportRow(input.row);
  const source = input.row || {};
  return {
    rowNo: row.rowNo,
    studentNo: row.studentNo,
    studentName: row.studentName,
    className: row.className,
    date: row.date,
    violationType: row.violationType,
    description: row.description,
    deductScore: row.deductScore,
    result: row.result,
    remark: row.remark,
    status: input.status === "ok" ? "ok" : "error",
    errorReason: safeString(input.errorReason ?? source.errorReason),
    warningReason: safeString(input.warningReason ?? source.warningReason),
    matchedStudentId: safeNullableNumber(input.matchedStudentId ?? source.matchedStudentId),
    matchedStudentName: safeNullableString(input.matchedStudentName ?? source.matchedStudentName)
  };
}

function sanitizePreviewResult(result: any): DisciplinePreviewResult {
  return {
    totalRows: safeNumber(result?.totalRows, 0),
    okRows: safeNumber(result?.okRows, 0),
    errorRows: safeNumber(result?.errorRows, 0),
    syncRows: safeNumber(result?.syncRows, 0),
    rows: Array.isArray(result?.rows)
      ? result.rows.map((row: any) => sanitizePreviewRow({
          row,
          status: row?.status === "ok" ? "ok" : "error",
          errorReason: row?.errorReason,
          warningReason: row?.warningReason,
          matchedStudentId: row?.matchedStudentId,
          matchedStudentName: row?.matchedStudentName
        }))
      : []
  };
}

function sanitizeImportResult(result: any): DisciplineImportResult {
  return {
    success: Boolean(result?.success),
    message: safeString(result?.message),
    imported: safeNumber(result?.imported, 0),
    failed: safeNumber(result?.failed, 0),
    attendanceSynced: safeNumber(result?.attendanceSynced, 0),
    attendanceSkipped: safeNumber(result?.attendanceSkipped, 0)
  };
}

function safeString(value: unknown) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function safeNullableString(value: unknown) {
  const text = safeString(value);
  return text ? text : null;
}

function safeNumber(value: unknown, fallback: number) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function safeNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}
