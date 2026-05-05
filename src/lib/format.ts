export const roleLabels: Record<string, string> = {
  admin: "管理员",
  principal: "校长",
  minister: "部长",
  moral_director: "德育主任",
  head_teacher: "班主任",
  subject_teacher: "任课老师"
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
  if (!date) return "-";
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(new Date(date));
}

export function displayDateTime(date?: Date | string | null) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(date));
}

export function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function scoreTotal(_score: Record<string, unknown>) {
  // 旧6列模式已废弃，保留空函数避免编译报错
  console.warn("scoreTotal() is deprecated, use scoreTotalFromSubjects() instead");
  return 0;
}

/** 从 subject 模式的成绩数组计算总分 */
export function scoreTotalFromSubjects(scores: Array<{ subject: string; score: number }>) {
  return scores.reduce((sum, s) => sum + (s.score || 0), 0);
}

/** 学科满分配置 */
export const SUBJECT_FULL_SCORES: Record<string, number> = {
  "语文": 150, "数学": 150, "英语": 150, "日语": 150, "俄语": 150,
  "物理": 100, "历史": 100, "地理": 100, "政治": 100, "生物": 100, "化学": 100,
};

/** 所有学科名称（按3+1+2顺序） */
export const ALL_SUBJECTS = [
  "语文", "数学", "英语", "日语", "俄语",
  "物理", "历史", "地理", "政治", "生物", "化学",
] as const;
