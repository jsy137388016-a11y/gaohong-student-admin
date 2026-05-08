import { prisma } from "@/lib/prisma";

export const DISCIPLINE_ATTENDANCE_MAP: Record<string, "late" | "absent" | "early_leave"> = {
  "迟到": "late",
  "旷课": "absent",
  "早退": "early_leave"
};

export function attendanceTypeFromDiscipline(type: string | null | undefined) {
  const normalized = String(type || "").trim();
  return DISCIPLINE_ATTENDANCE_MAP[normalized] || null;
}

function dayRange(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export async function syncAttendanceFromDiscipline(input: {
  studentId: number;
  violationType: string;
  recordedAt: Date;
  description?: string | null;
  recorder?: string | null;
}) {
  const type = attendanceTypeFromDiscipline(input.violationType);
  if (!type) return { synced: false as const, reason: "not_attendance_type" as const };

  const { start, end } = dayRange(input.recordedAt);
  const existing = await prisma.attendance.findFirst({
    where: {
      studentId: input.studentId,
      type,
      date: { gte: start, lt: end }
    },
    select: { id: true }
  });

  if (existing) return { synced: false as const, reason: "duplicate" as const, attendanceId: existing.id };

  const attendance = await prisma.attendance.create({
    data: {
      studentId: input.studentId,
      date: input.recordedAt,
      type,
      period: "",
      description: input.description ? `由纪律记录同步：${input.description}` : `由纪律记录同步：${input.violationType}`,
      recorder: input.recorder || "纪律同步",
      source: "discipline_sync"
    },
    select: { id: true }
  });

  return { synced: true as const, reason: "created" as const, attendanceId: attendance.id };
}
