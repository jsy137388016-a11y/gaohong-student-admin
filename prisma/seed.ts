import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.score.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.communication.deleteMany();
  await prisma.discipline.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.student.deleteMany();
  await prisma.classRoom.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("admin123", 10);

  await prisma.user.createMany({
    data: [
      { username: "admin", passwordHash, name: "系统管理员", role: "admin", roleCode: "admin", scopeType: "school", status: "active" },
      { username: "principal", passwordHash, name: "高校长", role: "principal", roleCode: "principal", scopeType: "school", status: "active" },
      { username: "minister", passwordHash, name: "教务部长", role: "minister", roleCode: "minister", scopeType: "department", scopeValue: "高三", status: "active" },
      { username: "moral", passwordHash, name: "德育主任", role: "moral_director", roleCode: "moral_director", scopeType: "school", status: "active" },
      { username: "teacher1", passwordHash, name: "李老师", role: "head_teacher", roleCode: "head_teacher", scopeType: "class", scopeValue: "李老师", status: "active" },
      { username: "teacher2", passwordHash, name: "王老师", role: "subject_teacher", roleCode: "subject_teacher", scopeType: "class", scopeValue: "王老师", status: "active" }
    ]
  });

  const classOne = await prisma.classRoom.create({
    data: { name: "艺考冲刺1班", grade: "高三", headTeacher: "李老师", remark: "播音、美术方向学生为主" }
  });
  const classTwo = await prisma.classRoom.create({
    data: { name: "艺考冲刺2班", grade: "高三", headTeacher: "王老师", remark: "音乐、舞蹈方向学生为主" }
  });

  const students = await prisma.student.createManyAndReturn({
    data: [
      {
        name: "张晨",
        gender: "male",
        grade: "高三",
        phone: "13800000001",
        parentName: "张先生",
        parentPhone: "13900000001",
        boardingStatus: "boarding",
        artMajor: "播音主持",
        remark: "文化课数学需重点跟进",
        classId: classOne.id
      },
      {
        name: "李雨桐",
        gender: "female",
        grade: "高三",
        phone: "13800000002",
        parentName: "李女士",
        parentPhone: "13900000002",
        boardingStatus: "day_student",
        artMajor: "美术",
        remark: "英语基础较好",
        classId: classOne.id
      },
      {
        name: "陈一诺",
        gender: "female",
        grade: "高三",
        phone: "13800000003",
        parentName: "陈先生",
        parentPhone: "13900000003",
        boardingStatus: "boarding",
        artMajor: "音乐",
        remark: "需关注寝室纪律",
        classId: classTwo.id
      },
      {
        name: "赵远",
        gender: "male",
        grade: "高三",
        phone: "13800000004",
        parentName: "赵女士",
        parentPhone: "13900000004",
        boardingStatus: "boarding",
        artMajor: "舞蹈",
        remark: "政治历史提升明显",
        classId: classTwo.id
      }
    ]
  });

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  await prisma.attendance.createMany({
    data: [
      { studentId: students[0].id, date: today, type: "leave", description: "专业课集训请假", recorder: "李老师" },
      { studentId: students[1].id, date: today, type: "normal", description: "正常到校", recorder: "李老师" },
      { studentId: students[2].id, date: yesterday, type: "late", description: "早读迟到10分钟", recorder: "王老师" }
    ]
  });

  await prisma.discipline.create({
    data: {
      studentId: students[2].id,
      violationType: "寝室纪律",
      description: "晚熄灯后仍使用手机",
      result: "批评教育，手机暂存一天",
      parentNotified: true,
      follower: "王老师",
      recordedAt: yesterday
    }
  });

  const exam = await prisma.exam.create({
    data: { name: "三月月考", examDate: yesterday, grade: "高三", remark: "MVP 演示考试" }
  });

  // subject 模式：每个学生每科一条 Score 记录
  const scoreData: Array<{ examId: number; studentId: number; classId: number | null; subject: string; score: number; fullScore: number }> = [];
  const rawScores = [
    { sid: 0, scores: { "语文": 98, "数学": 86, "英语": 92, "政治": 76, "历史": 80, "地理": 78 } },
    { sid: 1, scores: { "语文": 105, "数学": 90, "英语": 110, "政治": 82, "历史": 85, "地理": 81 } },
    { sid: 2, scores: { "语文": 91, "数学": 75, "英语": 88, "政治": 78, "历史": 76, "地理": 80 } },
  ];
  const fullScoreMap: Record<string, number> = { "语文": 150, "数学": 150, "英语": 150, "日语": 150, "俄语": 150, "物理": 100, "历史": 100, "地理": 100, "政治": 100, "生物": 100, "化学": 100 };

  for (const raw of rawScores) {
    const student = students[raw.sid];
    for (const [subject, score] of Object.entries(raw.scores)) {
      scoreData.push({ examId: exam.id, studentId: student.id, classId: student.classId, subject, score, fullScore: fullScoreMap[subject] || 100 });
    }
  }
  await prisma.score.createMany({ data: scoreData });

  await prisma.communication.createMany({
    data: [
      {
        studentId: students[0].id,
        target: "父亲",
        method: "phone",
        content: "沟通近期数学学习状态和请假安排",
        followUp: "本周五前反馈数学错题整理情况",
        communicator: "李老师",
        contactedAt: today
      },
      {
        studentId: students[2].id,
        target: "母亲",
        method: "wechat",
        content: "同步寝室纪律情况，家长配合提醒",
        followUp: "下周观察手机管理效果",
        communicator: "王老师",
        contactedAt: yesterday
      }
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed data created. Default login: admin / admin123");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
