PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS "WarningRecord";
DROP TABLE IF EXISTS "Communication";
DROP TABLE IF EXISTS "Score";
DROP TABLE IF EXISTS "Exam";
DROP TABLE IF EXISTS "Discipline";
DROP TABLE IF EXISTS "Attendance";
DROP TABLE IF EXISTS "Student";
DROP TABLE IF EXISTS "ClassRoom";
DROP TABLE IF EXISTS "User";

PRAGMA foreign_keys = ON;

CREATE TABLE "User" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "username" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'subject_teacher',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

CREATE TABLE "ClassRoom" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "grade" TEXT NOT NULL,
  "headTeacher" TEXT NOT NULL,
  "remark" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Student" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "studentNo" TEXT,
  "name" TEXT NOT NULL,
  "gender" TEXT NOT NULL,
  "grade" TEXT NOT NULL,
  "phone" TEXT,
  "parentName" TEXT NOT NULL,
  "parentPhone" TEXT NOT NULL,
  "boardingStatus" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "artMajor" TEXT,
  "remark" TEXT,
  "isFocus" BOOLEAN NOT NULL DEFAULT false,
  "focusNote" TEXT,
  "focusMarkedBy" TEXT,
  "focusMarkedAt" DATETIME,
  "classId" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Student_classId_fkey" FOREIGN KEY ("classId") REFERENCES "ClassRoom" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Attendance" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "studentId" INTEGER NOT NULL,
  "date" DATETIME NOT NULL,
  "type" TEXT NOT NULL,
  "period" TEXT NOT NULL DEFAULT '',
  "leaveType" TEXT,
  "leaveStart" DATETIME,
  "leaveEnd" DATETIME,
  "parentConfirmed" BOOLEAN NOT NULL DEFAULT false,
  "approvalStatus" TEXT NOT NULL DEFAULT '',
  "approver" TEXT,
  "description" TEXT,
  "recorder" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Attendance_date_idx" ON "Attendance"("date");

CREATE TABLE "Discipline" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "studentId" INTEGER NOT NULL,
  "violationType" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "result" TEXT NOT NULL,
  "deductScore" REAL NOT NULL DEFAULT 0,
  "parentNotified" BOOLEAN NOT NULL DEFAULT false,
  "follower" TEXT NOT NULL,
  "remark" TEXT,
  "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Discipline_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Discipline_recordedAt_idx" ON "Discipline"("recordedAt");

CREATE TABLE "Exam" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "examDate" DATETIME NOT NULL,
  "grade" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT '月考',
  "remark" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Score" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "examId" INTEGER NOT NULL,
  "studentId" INTEGER NOT NULL,
  "classId" INTEGER,
  "subject" TEXT NOT NULL,
  "score" REAL NOT NULL DEFAULT 0,
  "fullScore" REAL NOT NULL DEFAULT 0,
  "remark" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Score_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Score_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Score_examId_studentId_subject_key" ON "Score"("examId", "studentId", "subject");
CREATE INDEX "Score_examId_idx" ON "Score"("examId");
CREATE INDEX "Score_studentId_idx" ON "Score"("studentId");
CREATE INDEX "Score_classId_idx" ON "Score"("classId");

CREATE TABLE "Communication" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "studentId" INTEGER NOT NULL,
  "target" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "parentFeedback" TEXT,
  "followUp" TEXT,
  "communicator" TEXT NOT NULL,
  "contactedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "remark" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Communication_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Communication_contactedAt_idx" ON "Communication"("contactedAt");

CREATE TABLE "GuaranteeLetter" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "studentId" INTEGER NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileType" TEXT NOT NULL DEFAULT '',
  "fileSize" INTEGER NOT NULL DEFAULT 0,
  "fileUrl" TEXT NOT NULL DEFAULT '',
  "remark" TEXT,
  "uploadedBy" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "GuaranteeLetter_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "GuaranteeLetter_studentId_idx" ON "GuaranteeLetter"("studentId");

CREATE TABLE "WarningRecord" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "studentId" INTEGER NOT NULL,
  "level" TEXT NOT NULL,
  "warningType" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "currentMeasure" TEXT,
  "responsiblePerson" TEXT,
  "nextFollowUpAt" DATETIME,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "remark" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "WarningRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "WarningRecord_status_idx" ON "WarningRecord"("status");
CREATE INDEX "WarningRecord_level_idx" ON "WarningRecord"("level");
