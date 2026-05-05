"use server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ====== 类型定义 ======

export interface StudentImportRow {
  rowNo: number;
  className: string;
  name: string;
  gender: string;
  grade: string;
  phone: string;
  parentName: string;
  parentPhone: string;
  boardingStatus: string;
  artMajor: string;
  remark: string;
}

export interface StudentPreviewRow extends StudentImportRow {
  status: "ok" | "error" | "duplicate";
  errorReason: string;
}

export interface StudentPreviewResult {
  totalRows: number;
  okRows: number;
  errorRows: number;
  duplicateRows: number;
  newClassCount: number;
  rows: StudentPreviewRow[];
}

export interface StudentImportResult {
  success: boolean;
  message: string;
  imported: number;
  skipped: number;
  newClasses: number;
  failed: number;
  failedReasons: string[];
}

// ====== 常量 ======

const VALID_GENDERS = ["男", "female", "Female", "F", "f"];
const VALID_GRADES = ["高一", "高二", "高三", "复读", "其他"];
const VALID_BOARDING = ["住宿", "走读"];

function genderToDb(val: string): string | null {
  if (["男", "male", "Male", "M", "m"].includes(val)) return "male";
  if (["女", "female", "Female", "F", "f"].includes(val)) return "female";
  return null;
}

function boardingToDb(val: string): string | null {
  if (["住宿", "boarding", "住校"].includes(val)) return "boarding";
  if (["走读", "day_student", "day", "通校"].includes(val)) return "day_student";
  return null;
}

function gradeToDb(val: string): string | null {
  if (VALID_GRADES.includes(val)) return val;
  return null;
}

// ====== 校验导入数据 ======

export async function validateStudentImport(rawRows: StudentImportRow[]): Promise<StudentPreviewResult> {
  await requireUser();

  // 1. 查询所有活跃学生（用于重复检测）
  let allStudents: any[] = [];
  try {
    allStudents = await prisma.student.findMany({
      where: { status: "active" }
    });
  } catch {
    try {
      allStudents = await prisma.student.findMany({});
      allStudents = allStudents.filter((s: any) => s.status !== "withdrawn" && s.status !== "inactive" && s.status !== "deleted");
    } catch {
      allStudents = [];
    }
  }

  // 2. 查询所有班级（用于判断哪些班级需要新建）
  let allClasses: any[] = [];
  try {
    allClasses = await prisma.classRoom.findMany({
      where: { status: "active" }
    });
  } catch {
    try {
      allClasses = await prisma.classRoom.findMany({});
      allClasses = allClasses.filter((c: any) => c.status !== "inactive");
    } catch {
      allClasses = [];
    }
  }

  // 构建班级查找集合
  const classKeySet = new Set<string>();
  for (const cls of allClasses) {
    classKeySet.add(`${cls.grade}__${cls.name}`);
  }

  // 用于跟踪本次导入中新增的班级
  const newClassKeys = new Set<string>();

  // 3. 逐行校验
  const rows: StudentPreviewRow[] = [];
  let okRows = 0;
  let errorRows = 0;
  let duplicateRows = 0;

  // 用于同一批次内的重复检测
  const batchPhoneSet = new Map<string, number>(); // phone -> rowNo
  const batchNameParentPhoneSet = new Map<string, number>(); // name+parentPhone -> rowNo
  const batchNameClassParentSet = new Map<string, number>(); // name+className+parentName -> rowNo

  for (const row of rawRows) {
    const errors: string[] = [];

    // 必填字段校验
    if (!row.name || !row.name.trim()) {
      errors.push("姓名为空");
    }
    if (!row.gender || !row.gender.trim()) {
      errors.push("性别为空");
    } else if (!genderToDb(row.gender.trim())) {
      errors.push("性别必须是男或女");
    }
    if (!row.grade || !row.grade.trim()) {
      errors.push("年级为空");
    } else if (!gradeToDb(row.grade.trim())) {
      errors.push(`年级不符合要求，允许值：${VALID_GRADES.join("、")}`);
    }
    if (!row.parentName || !row.parentName.trim()) {
      errors.push("家长姓名为空");
    }
    if (!row.parentPhone || !row.parentPhone.trim()) {
      errors.push("家长电话为空");
    }
    if (!row.boardingStatus || !row.boardingStatus.trim()) {
      errors.push("住宿状态为空");
    } else if (!boardingToDb(row.boardingStatus.trim())) {
      errors.push("住宿状态必须是住宿或走读");
    }

    // 家长电话格式简单校验（不严格）
    if (row.parentPhone && row.parentPhone.trim()) {
      const pp = row.parentPhone.trim();
      if (!/^\d{7,13}$/.test(pp.replace(/[-\s]/g, ""))) {
        // 不强制报错，仅标记提示
      }
    }

    // 如果有必填错误，直接标记为错误行
    if (errors.length > 0) {
      rows.push({
        ...row,
        status: "error",
        errorReason: errors.join("；")
      });
      errorRows++;
      continue;
    }

    // 重复检测
    const duplicateReason = checkDuplicate(row, allStudents, batchPhoneSet, batchNameParentPhoneSet, batchNameClassParentSet);

    if (duplicateReason) {
      rows.push({
        ...row,
        status: "duplicate",
        errorReason: duplicateReason
      });
      duplicateRows++;
      continue;
    }

    // 记录到批次集合（用于同一文件内的重复检测）
    if (row.phone && row.phone.trim()) {
      batchPhoneSet.set(row.phone.trim(), row.rowNo);
    }
    if (row.name && row.parentPhone) {
      batchNameParentPhoneSet.set(`${row.name.trim()}__${row.parentPhone.trim()}`, row.rowNo);
    }
    if (row.name && row.className && row.parentName) {
      batchNameClassParentSet.set(`${row.name.trim()}__${row.className.trim()}__${row.parentName.trim()}`, row.rowNo);
    }

    // 检查班级是否需要新建
    const grade = gradeToDb(row.grade.trim())!;
    const className = row.className?.trim() || "";
    if (className) {
      const classKey = `${grade}__${className}`;
      if (!classKeySet.has(classKey) && !newClassKeys.has(classKey)) {
        newClassKeys.add(classKey);
      }
    }

    rows.push({
      ...row,
      status: "ok",
      errorReason: ""
    });
    okRows++;
  }

  return {
    totalRows: rawRows.length,
    okRows,
    errorRows,
    duplicateRows,
    newClassCount: newClassKeys.size,
    rows
  };
}

// ====== 重复检测 ======

function checkDuplicate(
  row: StudentImportRow,
  allStudents: any[],
  batchPhoneSet: Map<string, number>,
  batchNameParentPhoneSet: Map<string, number>,
  batchNameClassParentSet: Map<string, number>
): string | null {
  const name = row.name?.trim() || "";
  const phone = row.phone?.trim() || "";
  const parentName = row.parentName?.trim() || "";
  const parentPhone = row.parentPhone?.trim() || "";
  const className = row.className?.trim() || "";

  // 1. 手机号相同（且手机号不为空）
  if (phone) {
    // 先检查同一批次
    if (batchPhoneSet.has(phone)) {
      return `手机号重复（与本文件第${batchPhoneSet.get(phone)}行相同）`;
    }
    // 再检查数据库
    const byPhone = allStudents.find((s: any) => s.phone && s.phone.trim() === phone);
    if (byPhone) {
      return "手机号重复";
    }
  }

  // 2. 姓名 + 家长电话相同
  if (name && parentPhone) {
    const key = `${name}__${parentPhone}`;
    if (batchNameParentPhoneSet.has(key)) {
      return `姓名和家长电话重复（与本文件第${batchNameParentPhoneSet.get(key)}行相同）`;
    }
    const byNameParentPhone = allStudents.find(
      (s: any) => s.name?.trim() === name && s.parentPhone?.trim() === parentPhone
    );
    if (byNameParentPhone) {
      return "姓名和家长电话重复";
    }
  }

  // 3. 姓名 + 班级 + 家长姓名相同
  if (name && className && parentName) {
    const key = `${name}__${className}__${parentName}`;
    if (batchNameClassParentSet.has(key)) {
      return `同班级同姓名同家长姓名重复（与本文件第${batchNameClassParentSet.get(key)}行相同）`;
    }
    const byNameClassParent = allStudents.find((s: any) => {
      if (s.name?.trim() !== name) return false;
      if (s.parentName?.trim() !== parentName) return false;
      if (!s.classRoom) return false;
      return s.classRoom.name?.trim() === className;
    });
    if (byNameClassParent) {
      return "同班级同姓名同家长姓名重复";
    }
  }

  return null;
}

// ====== 确认导入 ======

export async function confirmStudentImport(rows: StudentPreviewRow[]): Promise<StudentImportResult> {
  await requireUser();

  // 只导入 status=ok 的行（第一版默认跳过重复学生）
  const importableRows = rows.filter((r) => r.status === "ok");
  if (importableRows.length === 0) {
    return {
      success: false,
      message: "没有可导入的数据",
      imported: 0,
      skipped: 0,
      newClasses: 0,
      failed: 0,
      failedReasons: []
    };
  }

  let imported = 0;
  let skipped = 0;
  let newClasses = 0;
  let failed = 0;
  const failedReasons: string[] = [];

  // 查询所有班级（用于缓存）
  let allClasses: any[] = [];
  try {
    allClasses = await prisma.classRoom.findMany({
      where: { status: "active" }
    });
  } catch {
    try {
      allClasses = await prisma.classRoom.findMany({});
      allClasses = allClasses.filter((c: any) => c.status !== "inactive");
    } catch {
      allClasses = [];
    }
  }

  const classCache = new Map<string, number | null>();
  for (const cls of allClasses) {
    classCache.set(`${cls.grade}__${cls.name}`, cls.id);
  }

  for (const row of importableRows) {
    try {
      const gender = genderToDb(row.gender.trim());
      const grade = gradeToDb(row.grade.trim());
      const boardingStatus = boardingToDb(row.boardingStatus.trim());

      if (!gender || !grade || !boardingStatus) {
        failed++;
        failedReasons.push(`第${row.rowNo}行：字段格式校验失败`);
        continue;
      }

      // 处理班级
      const className = row.className?.trim() || "";
      let classId: number | null = null;
      const classKey = className ? `${grade}__${className}` : "";

      if (className) {
        if (classCache.has(classKey)) {
          classId = classCache.get(classKey) ?? null;
        } else {
          // 班级不存在，自动创建
          const newClass = await prisma.classRoom.create({
            data: {
              grade,
              name: className,
              headTeacher: "待分配",
              remark: "批量导入自动创建"
            }
          });
          classId = newClass.id;
          classCache.set(classKey, classId);
          newClasses++;
        }
      }

      // 再次做重复检测（防止并发问题）
      const phone = row.phone?.trim() || "";
      const parentPhone = row.parentPhone?.trim() || "";
      const parentName = row.parentName?.trim() || "";
      const name = row.name.trim();

      let isDuplicate = false;
      try {
        const orConditions: any[] = [];

        // 手机号重复
        if (phone) {
          orConditions.push({ phone, status: "active" });
        }
        // 姓名+家长电话重复
        orConditions.push({ name, parentPhone, status: "active" });
        // 姓名+班级+家长姓名重复
        if (className && classId) {
          orConditions.push({ name, parentName, classId, status: "active" });
        }

        const existing = await prisma.student.findFirst({
          where: { OR: orConditions }
        });
        if (existing) isDuplicate = true;
      } catch {
        // 重复检测失败，允许继续导入
      }

      if (isDuplicate) {
        skipped++;
        continue;
      }

      // 创建学生
      await prisma.student.create({
        data: {
          name,
          gender: gender as "male" | "female",
          grade,
          phone: phone || null,
          parentName,
          parentPhone,
          boardingStatus: boardingStatus as "boarding" | "day_student",
          artMajor: row.artMajor?.trim() || null,
          remark: row.remark?.trim() || null,
          classId
        }
      });
      imported++;
    } catch (e: any) {
      failed++;
      failedReasons.push(`第${row.rowNo}行：${e?.message || "未知错误"}`);
    }
  }

  const parts: string[] = [];
  if (imported > 0) parts.push(`成功导入 ${imported} 名学生`);
  if (skipped > 0) parts.push(`跳过 ${skipped} 名重复学生`);
  if (newClasses > 0) parts.push(`自动创建 ${newClasses} 个班级`);
  if (failed > 0) parts.push(`失败 ${failed} 行`);

  return {
    success: true,
    message: parts.join("，") || "导入完成",
    imported,
    skipped,
    newClasses,
    failed,
    failedReasons
  };
}
