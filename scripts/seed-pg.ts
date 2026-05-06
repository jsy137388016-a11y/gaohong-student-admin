import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const data = JSON.parse(
  fs.readFileSync(path.join(__dirname, "seed-data.json"), "utf-8")
);

const prisma = new PrismaClient();

// SQLite boolean 0/1 → boolean
function bool(val: any): boolean {
  return val === 1 || val === true || val === "true";
}

// SQLite date string → Date
function date(val: any): Date | null {
  if (!val) return null;
  return new Date(val);
}

async function main() {
  console.log("开始导入数据到 PostgreSQL...");

  // 按依赖顺序导入

  // 1. User
  console.log(`  导入 User (${data.User.length} 条)`);
  for (const u of data.User) {
    await prisma.user.create({
      data: {
        id: u.id,
        username: u.username,
        passwordHash: u.passwordHash,
        name: u.name,
        role: u.role,
        createdAt: date(u.createdAt)!,
        updatedAt: date(u.updatedAt)!,
      },
    });
  }

  // 2. ClassRoom
  console.log(`  导入 ClassRoom (${data.ClassRoom.length} 条)`);
  for (const c of data.ClassRoom) {
    await prisma.classRoom.create({
      data: {
        id: c.id,
        name: c.name,
        grade: c.grade,
        headTeacher: c.headTeacher,
        remark: c.remark || null,
        status: c.status || "active",
        createdAt: date(c.createdAt)!,
        updatedAt: date(c.updatedAt)!,
      },
    });
  }

  // 3. Student
  console.log(`  导入 Student (${data.Student.length} 条)`);
  for (const s of data.Student) {
    await prisma.student.create({
      data: {
        id: s.id,
        studentNo: s.studentNo || null,
        name: s.name,
        gender: s.gender,
        grade: s.grade,
        phone: s.phone || null,
        parentName: s.parentName,
        parentPhone: s.parentPhone,
        boardingStatus: s.boardingStatus,
        status: s.status || "active",
        artMajor: s.artMajor || null,
        remark: s.remark || null,
        isFocus: bool(s.isFocus),
        focusNote: s.focusNote || null,
        focusMarkedBy: s.focusMarkedBy || null,
        focusMarkedAt: date(s.focusMarkedAt),
        classId: s.classId || null,
        createdAt: date(s.createdAt)!,
        updatedAt: date(s.updatedAt)!,
      },
    });
  }

  // 4. Exam
  console.log(`  导入 Exam (${data.Exam.length} 条)`);
  for (const e of data.Exam) {
    await prisma.exam.create({
      data: {
        id: e.id,
        name: e.name,
        examDate: date(e.examDate)!,
        grade: e.grade,
        type: e.type || "月考",
        remark: e.remark || null,
        createdAt: date(e.createdAt)!,
        updatedAt: date(e.updatedAt)!,
      },
    });
  }

  // 5. Attendance
  console.log(`  导入 Attendance (${data.Attendance.length} 条)`);
  for (const a of data.Attendance) {
    await prisma.attendance.create({
      data: {
        id: a.id,
        studentId: a.studentId,
        date: date(a.date)!,
        type: a.type,
        period: a.period || "",
        leaveType: a.leaveType || null,
        leaveStart: date(a.leaveStart),
        leaveEnd: date(a.leaveEnd),
        parentConfirmed: bool(a.parentConfirmed),
        approvalStatus: a.approvalStatus || "",
        approver: a.approver || null,
        description: a.description || null,
        recorder: a.recorder,
        createdAt: date(a.createdAt)!,
      },
    });
  }

  // 6. Discipline
  console.log(`  导入 Discipline (${data.Discipline.length} 条)`);
  for (const d of data.Discipline) {
    await prisma.discipline.create({
      data: {
        id: d.id,
        studentId: d.studentId,
        violationType: d.violationType,
        description: d.description || "",
        result: d.result || "",
        deductScore: Number(d.deductScore) || 0,
        parentNotified: bool(d.parentNotified),
        follower: d.follower,
        remark: d.remark || null,
        recordedAt: date(d.recordedAt)!,
      },
    });
  }

  // 7. Score
  console.log(`  导入 Score (${data.Score.length} 条)`);
  for (const s of data.Score) {
    await prisma.score.create({
      data: {
        id: s.id,
        examId: s.examId,
        studentId: s.studentId,
        classId: s.classId || null,
        subject: s.subject,
        score: Number(s.score) || 0,
        fullScore: Number(s.fullScore) || 0,
        remark: s.remark || null,
        createdAt: date(s.createdAt)!,
        updatedAt: date(s.updatedAt)!,
      },
    });
  }

  // 8. Communication
  console.log(`  导入 Communication (${data.Communication.length} 条)`);
  for (const c of data.Communication) {
    await prisma.communication.create({
      data: {
        id: c.id,
        studentId: c.studentId,
        target: c.target,
        method: c.method,
        content: c.content,
        parentFeedback: c.parentFeedback || null,
        followUp: c.followUp || null,
        communicator: c.communicator,
        contactedAt: date(c.contactedAt)!,
        remark: c.remark || null,
        createdAt: date(c.createdAt)!,
      },
    });
  }

  // 9. GuaranteeLetter
  console.log(`  导入 GuaranteeLetter (${data.GuaranteeLetter.length} 条)`);
  for (const g of data.GuaranteeLetter) {
    await prisma.guaranteeLetter.create({
      data: {
        id: g.id,
        studentId: g.studentId,
        fileName: g.fileName,
        fileType: g.fileType || "",
        fileSize: Number(g.fileSize) || 0,
        fileUrl: g.fileUrl || "",
        remark: g.remark || null,
        uploadedBy: g.uploadedBy,
        createdAt: date(g.createdAt)!,
        updatedAt: date(g.updatedAt)!,
      },
    });
  }

  // 10. WarningRecord
  console.log(`  导入 WarningRecord (${data.WarningRecord.length} 条)`);
  for (const w of data.WarningRecord) {
    await prisma.warningRecord.create({
      data: {
        id: w.id,
        studentId: w.studentId,
        level: w.level,
        warningType: w.warningType,
        reason: w.reason,
        currentMeasure: w.currentMeasure || null,
        responsiblePerson: w.responsiblePerson || null,
        nextFollowUpAt: date(w.nextFollowUpAt),
        status: w.status || "pending",
        remark: w.remark || null,
        createdAt: date(w.createdAt)!,
        updatedAt: date(w.updatedAt)!,
      },
    });
  }

  // Reset auto-increment sequences to max(id) + 1
  const tables_seq = ["User","ClassRoom","Student","Exam","Attendance","Discipline","Score","Communication","GuaranteeLetter","WarningRecord"];
  for (const t of tables_seq) {
    const modelName = t.charAt(0).toLowerCase() + t.slice(1);
    const table = t.charAt(0).toLowerCase() + t.slice(1);
    const result: any = await (prisma as any)[modelName].findFirst({
      orderBy: { id: "desc" },
      select: { id: true },
    });
    const maxId = result?.id || 0;
    const seqName = `"${table}_id_seq"`;
    await prisma.$executeRawUnsafe(
      `SELECT setval(${seqName}, ${maxId + 1}, false)`
    );
  }

  console.log("\n✅ 数据导入完成！");
}

main()
  .catch((e) => {
    console.error("导入失败:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
