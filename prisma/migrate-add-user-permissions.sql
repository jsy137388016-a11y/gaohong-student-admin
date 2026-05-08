ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "roleCode" TEXT NOT NULL DEFAULT 'subject_teacher';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "scopeType" TEXT NOT NULL DEFAULT 'school';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "scopeValue" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';

UPDATE "User"
SET "roleCode" = COALESCE("roleCode", "role"::text),
    "scopeType" = CASE
      WHEN "role"::text IN ('admin', 'principal', 'moral_director') THEN 'school'
      WHEN "role"::text = 'minister' THEN 'department'
      ELSE 'class'
    END,
    "scopeValue" = CASE
      WHEN "role"::text IN ('head_teacher', 'subject_teacher') THEN "name"
      ELSE "scopeValue"
    END,
    "status" = COALESCE("status", 'active');
