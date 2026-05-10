export const SCORE_SUBJECT_KEYS = [
  "chinese",
  "math",
  "foreignLanguage",
  "preferredSubject",
  "geography",
  "politics",
  "biology",
  "chemistry",
] as const;

export type ScoreSubjectKey = (typeof SCORE_SUBJECT_KEYS)[number];

export const SCORE_SUBJECT_LABELS: Record<ScoreSubjectKey, string> = {
  chinese: "语文",
  math: "数学",
  foreignLanguage: "外语",
  preferredSubject: "历史/物理",
  geography: "地理",
  politics: "政治",
  biology: "生物",
  chemistry: "化学",
};

export const SCORE_SUBJECT_FULL_SCORES: Record<ScoreSubjectKey, number> = {
  chinese: 150,
  math: 150,
  foreignLanguage: 150,
  preferredSubject: 100,
  geography: 100,
  politics: 100,
  biology: 100,
  chemistry: 100,
};

export const SCORE_TEMPLATE_HEADERS: string[] = [
  "班级",
  "姓名",
  ...SCORE_SUBJECT_KEYS.map((key) => SCORE_SUBJECT_LABELS[key]),
];
