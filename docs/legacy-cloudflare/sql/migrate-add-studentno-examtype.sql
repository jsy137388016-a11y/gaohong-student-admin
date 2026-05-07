-- 迁移：Student 加 studentNo，Exam 加 type 和 updatedAt
-- 执行日期：2026-05-04

ALTER TABLE "Student" ADD COLUMN "studentNo" TEXT;

ALTER TABLE "Exam" ADD COLUMN "type" TEXT NOT NULL DEFAULT '月考';
ALTER TABLE "Exam" ADD COLUMN "updatedAt" DATETIME;
UPDATE "Exam" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
