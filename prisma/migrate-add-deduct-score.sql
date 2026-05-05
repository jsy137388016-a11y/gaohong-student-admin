-- 给 Discipline 表添加 deductScore 字段（德育扣分）
-- 日期：2026-05-05

ALTER TABLE "Discipline" ADD COLUMN "deductScore" REAL NOT NULL DEFAULT 0;
