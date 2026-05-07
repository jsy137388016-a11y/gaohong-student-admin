-- 迁移：给 ClassRoom 表增加 status 字段（软删除支持）
-- 执行方式（生产 D1）：
--   wrangler d1 execute gaohong-student-system-db --remote --file prisma/migrate-add-class-status.sql
-- 执行方式（本地预览）：
--   wrangler d1 execute gaohong-student-system-db --local --file prisma/migrate-add-class-status.sql

ALTER TABLE "ClassRoom" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
