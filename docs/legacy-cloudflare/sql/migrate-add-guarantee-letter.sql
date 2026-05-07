-- 创建 GuaranteeLetter（保证书留档）表
-- 日期：2026-05-05

CREATE TABLE IF NOT EXISTS "GuaranteeLetter" (
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

CREATE INDEX IF NOT EXISTS "GuaranteeLetter_studentId_idx" ON "GuaranteeLetter"("studentId");
