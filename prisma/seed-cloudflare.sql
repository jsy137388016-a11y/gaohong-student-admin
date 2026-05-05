INSERT INTO "User" ("username", "passwordHash", "name", "role", "createdAt", "updatedAt") VALUES
  ('admin', '$2b$10$18ax3.ROt1Gb.UBMq4R3nOB3CwX7QWY3vHyVDmFsAJi4KJTWBAyxS', '系统管理员', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('principal', '$2b$10$18ax3.ROt1Gb.UBMq4R3nOB3CwX7QWY3vHyVDmFsAJi4KJTWBAyxS', '高校长', 'principal', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('minister', '$2b$10$18ax3.ROt1Gb.UBMq4R3nOB3CwX7QWY3vHyVDmFsAJi4KJTWBAyxS', '教务部长', 'minister', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('teacher1', '$2b$10$18ax3.ROt1Gb.UBMq4R3nOB3CwX7QWY3vHyVDmFsAJi4KJTWBAyxS', '李老师', 'head_teacher', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('teacher2', '$2b$10$18ax3.ROt1Gb.UBMq4R3nOB3CwX7QWY3vHyVDmFsAJi4KJTWBAyxS', '王老师', 'head_teacher', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "ClassRoom" ("name", "grade", "headTeacher", "remark", "createdAt", "updatedAt") VALUES
  ('艺考冲刺1班', '高三', '李老师', '播音、美术方向学生为主', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('艺考冲刺2班', '高三', '王老师', '音乐、舞蹈方向学生为主', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "Student" (
  "name", "gender", "grade", "phone", "parentName", "parentPhone", "boardingStatus",
  "artMajor", "remark", "isFocus", "focusNote", "focusMarkedBy", "focusMarkedAt",
  "classId", "createdAt", "updatedAt"
) VALUES
  ('张晨', 'male', '高三', '13800000001', '张先生', '13900000001', 'boarding', '播音主持', '文化课数学需重点跟进', false, NULL, NULL, NULL, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('李雨桐', 'female', '高三', '13800000002', '李女士', '13900000002', 'day_student', '美术', '英语基础较好', false, NULL, NULL, NULL, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('陈一诺', 'female', '高三', '13800000003', '陈先生', '13900000003', 'boarding', '音乐', '需关注寝室纪律', false, NULL, NULL, NULL, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('赵远', 'male', '高三', '13800000004', '赵女士', '13900000004', 'boarding', '舞蹈', '政治历史提升明显', false, NULL, NULL, NULL, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "Exam" ("name", "examDate", "grade", "remark", "createdAt") VALUES
  ('三月月考', CURRENT_TIMESTAMP, '高三', 'Cloudflare D1 演示考试', CURRENT_TIMESTAMP);

-- subject 模式：每个学生每科一条 Score 记录
INSERT INTO "Score" ("examId", "studentId", "classId", "subject", "score", "fullScore", "createdAt", "updatedAt") VALUES
  (1, 1, 1, '语文', 98, 150, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (1, 1, 1, '数学', 86, 150, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (1, 1, 1, '英语', 92, 150, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (1, 1, 1, '政治', 76, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (1, 1, 1, '历史', 80, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (1, 1, 1, '地理', 78, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (1, 2, 1, '语文', 105, 150, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (1, 2, 1, '数学', 90, 150, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (1, 2, 1, '英语', 110, 150, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (1, 2, 1, '政治', 82, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (1, 2, 1, '历史', 85, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (1, 2, 1, '地理', 81, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (1, 3, 2, '语文', 91, 150, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (1, 3, 2, '数学', 75, 150, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (1, 3, 2, '英语', 88, 150, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (1, 3, 2, '政治', 78, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (1, 3, 2, '历史', 76, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (1, 3, 2, '地理', 80, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "Attendance" ("studentId", "date", "type", "description", "recorder", "createdAt") VALUES
  (1, CURRENT_TIMESTAMP, 'leave', '专业课集训请假', '李老师', CURRENT_TIMESTAMP),
  (2, CURRENT_TIMESTAMP, 'normal', '正常到校', '李老师', CURRENT_TIMESTAMP),
  (3, CURRENT_TIMESTAMP, 'late', '早读迟到10分钟', '王老师', CURRENT_TIMESTAMP);

INSERT INTO "Discipline" (
  "studentId", "violationType", "description", "result", "parentNotified", "follower", "recordedAt"
) VALUES
  (3, '寝室纪律', '晚熄灯后仍使用手机', '批评教育，手机暂存一天', true, '王老师', CURRENT_TIMESTAMP);

INSERT INTO "Communication" (
  "studentId", "target", "method", "content", "followUp", "communicator", "contactedAt", "createdAt"
) VALUES
  (1, '父亲', 'phone', '沟通近期数学学习状态和请假安排', '本周五前反馈数学错题整理情况', '李老师', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (3, '母亲', 'wechat', '同步寝室纪律情况，家长配合提醒', '下周观察手机管理效果', '王老师', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
