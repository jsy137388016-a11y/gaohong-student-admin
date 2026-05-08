ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'manual';
UPDATE "Attendance" SET "source" = 'manual' WHERE "source" IS NULL OR "source" = '';
