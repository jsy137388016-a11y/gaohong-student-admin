export const roleLabels: Record<string, string> = {
  admin: "管理员",
  principal: "校长",
  minister: "部长",
  moral_director: "德育主任",
  head_teacher: "班主任",
  homeroom_teacher: "班主任",
  subject_teacher: "任课老师"
};

export const scopeTypeLabels: Record<string, string> = {
  school: "全校",
  department: "部门",
  class: "班级"
};

export const accountStatusLabels: Record<string, string> = {
  active: "启用",
  disabled: "停用"
};

export const genderLabels: Record<string, string> = {
  male: "男",
  female: "女"
};

export const boardingLabels: Record<string, string> = {
  boarding: "住宿",
  day_student: "走读"
};

export const studentStatusLabels: Record<string, string> = {
  active: "在读",
  withdrawn: "已退学"
};

export const attendanceLabels: Record<string, string> = {
  normal: "正常",
  late: "迟到",
  leave: "请假",
  absent: "旷课",
  early_leave: "早退",
  dorm_absent: "未归寝"
};

export const attendanceSourceLabels: Record<string, string> = {
  manual: "手动录入",
  discipline_sync: "纪律同步"
};

export const methodLabels: Record<string, string> = {
  phone: "电话",
  wechat: "微信",
  onsite: "面谈",
  message: "短信/留言",
  other: "其他"
};

export function dateInputValue(date?: Date | string | null) {
  if (!date) return "";
  const value = typeof date === "string" ? new Date(date) : date;
  return value.toISOString().slice(0, 10);
}

export function dateTimeInputValue(date?: Date | string | null) {
  if (!date) return "";
  const value = typeof date === "string" ? new Date(date) : date;
  const offsetMs = value.getTimezoneOffset() * 60 * 1000;
  return new Date(value.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function displayDate(date?: Date | string | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(new Date(date));
}

export function displayDateTime(date?: Date | string | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(date));
}

export function displayValue(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function scoreTotal(_score: Record<string, unknown>) {
  console.warn("scoreTotal() is deprecated, use scoreTotalFromSubjects() instead");
  return 0;
}

export function scoreTotalFromSubjects(scores: Array<{ subject: string; score: number }>) {
  return scores.reduce((sum, s) => sum + (s.score || 0), 0);
}

export const SUBJECT_FULL_SCORES: Record<string, number> = {
  "语文": 150, "数学": 150, "英语": 150, "日语": 150, "俄语": 150,
  "物理": 100, "历史": 100, "地理": 100, "政治": 100, "生物": 100, "化学": 100,
};

export const ALL_SUBJECTS = [
  "语文", "数学", "英语", "日语", "俄语",
  "物理", "历史", "地理", "政治", "生物", "化学",
] as const;
