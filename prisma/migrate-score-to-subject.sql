-- Migration: Score表从"一行多科"改为"一行一科" (subject模式)
-- 支持3+1+2新高考：语文/数学/英语/日语/俄语/物理/历史/化学/生物/政治/地理
-- 日期: 2026-05-04

-- Step 1: 创建新Score表
CREATE TABLE "Score_new" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "examId" INTEGER NOT NULL,
  "studentId" INTEGER NOT NULL,
  "classId" INTEGER,
  "subject" TEXT NOT NULL,
  "score" REAL NOT NULL DEFAULT 0,
  "fullScore" REAL NOT NULL DEFAULT 0,
  "remark" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Score_new_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Score_new_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Step 2: 迁移旧数据（每行6科拆为6行）
-- 语文 (满分150)
INSERT INTO "Score_new" ("examId", "studentId", "classId", "subject", "score", "fullScore", "createdAt", "updatedAt")
SELECT "examId", "studentId", NULL, '语文', "chinese", 150, "createdAt", "updatedAt"
FROM "Score" WHERE "chinese" != 0;

-- 数学 (满分150)
INSERT INTO "Score_new" ("examId", "studentId", "classId", "subject", "score", "fullScore", "createdAt", "updatedAt")
SELECT "examId", "studentId", NULL, '数学', "math", 150, "createdAt", "updatedAt"
FROM "Score" WHERE "math" != 0;

-- 英语 (满分150)
INSERT INTO "Score_new" ("examId", "studentId", "classId", "subject", "score", "fullScore", "createdAt", "updatedAt")
SELECT "examId", "studentId", NULL, '英语', "english", 150, "createdAt", "updatedAt"
FROM "Score" WHERE "english" != 0;

-- 政治 (满分100)
INSERT INTO "Score_new" ("examId", "studentId", "classId", "subject", "score", "fullScore", "createdAt", "updatedAt")
SELECT "examId", "studentId", NULL, '政治', "politics", 100, "createdAt", "updatedAt"
FROM "Score" WHERE "politics" != 0;

-- 历史 (满分100)
INSERT INTO "Score_new" ("examId", "studentId", "classId", "subject", "score", "fullScore", "createdAt", "updatedAt")
SELECT "examId", "studentId", NULL, '历史', "history", 100, "createdAt", "updatedAt"
FROM "Score" WHERE "history" != 0;

-- 地理 (满分100)
INSERT INTO "Score_new" ("examId", "studentId", "classId", "subject", "score", "fullScore", "createdAt", "updatedAt")
SELECT "examId", "studentId", NULL, '地理', "geography", 100, "createdAt", "updatedAt"
FROM "Score" WHERE "geography" != 0;

-- Step 3: 删除旧表，重命名新表
DROP TABLE "Score";
ALTER TABLE "Score_new" RENAME TO "Score";

-- Step 4: 创建索引
CREATE UNIQUE INDEX "Score_examId_studentId_subject_key" ON "Score"("examId", "studentId", "subject");
CREATE INDEX "Score_examId_idx" ON "Score"("examId");
CREATE INDEX "Score_studentId_idx" ON "Score"("studentId");
CREATE INDEX "Score_classId_idx" ON "Score"("classId");
