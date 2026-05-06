# 高宏学生管理系统 MVP

这是一个面向艺考文补机构/学校的网页版学生管理后台，用于管理学生档案、班级、考勤、纪律、成绩、家校沟通、重点关注和后台账号。

当前主分支按 **PostgreSQL + Next.js standalone** 方向运行。仓库中保留了部分 Cloudflare/D1 迁移资料，作为历史部署参考；本地开发和当前构建以 `prisma/schema.prisma` 的 PostgreSQL 配置为准。

## 技术栈

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Prisma 6
- PostgreSQL
- bcryptjs 基础账号密码登录
- xlsx 批量导入

## 运行步骤

1. 安装依赖

```bash
npm install
```

2. 创建环境变量

```bash
cp .env.example .env
```

然后把 `.env` 里的 `DATABASE_URL` 改成你的 PostgreSQL 地址，例如：

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gaohong_student_admin?schema=public"
AUTH_COOKIE_NAME="gaohong_session"
```

3. 初始化数据库并写入演示数据

```bash
npm run db:init
```

4. 启动系统

```bash
npm run dev
```

浏览器打开：http://127.0.0.1:3001

5. 生产构建

```bash
npm run build
```

## 默认账号

- 账号：admin
- 密码：admin123

## 已完成功能

- 登录与角色字段：admin、校长、部长、德育主任、班主任、任课老师
- 学生管理：新增、编辑、搜索、筛选、软删除、批量导入
- 班级管理：新增、编辑、停用、查看班级学生、换班、退学
- 考勤管理：记录考勤、请假、迟到、旷课等状态
- 纪律管理：记录违纪、处理结果、通知家长、扣分
- 成绩管理：考试管理、按科目记录成绩、成绩导入相关组件
- 家校沟通：记录沟通对象、方式、内容、反馈和跟进事项
- 重点关注：重点学生和预警记录集中查看
- 系统设置：管理员/校长新增后台账号

## 批量导入学生

进入“学生管理”，点击“下载CSV模板”或使用 Excel 导入入口，填写学生信息后上传导入。

导入字段包括：姓名、性别、年级、班级、手机号、家长姓名、家长电话、住宿状态、艺考专业、备注。

注意事项：

- 性别填写：男 / 女
- 住宿状态填写：住宿 / 走读
- 班级不存在时，系统会自动创建班级，班主任暂记为“待分配”
- 姓名 + 家长电话重复，或姓名 + 手机号重复时，会跳过，避免重复导入

## 班主任与重点关注

- 班主任账号进入“学生管理”时，只显示自己担任班主任的班级学生。
- 点击学生姓名进入详情页，可以填写“学生情况”并标记为“重点关注学生”。
- “重点关注”页面用于部长、校长集中查看全校重点关注学生；班主任进入时只看到自己班级里的重点关注学生。

## 添加班主任和管理员

使用管理员或校长账号登录，进入“系统设置”，在“新增账号”中填写登录账号、姓名、初始密码和角色。

如果新增的是班主任账号，还需要进入“班级管理”，编辑对应班级，把“班主任”填写成该账号的“姓名”。系统会用这个姓名判断班主任能看到哪些班级学生。

## 主要目录

- `src/app`：页面和 Server Actions
- `src/components`：后台布局和通用组件
- `src/lib`：数据库、登录、表单工具
- `prisma/schema.prisma`：PostgreSQL 数据库模型
- `prisma/seed.ts`：初始化演示数据
- `scripts/seed-pg.ts`：从导出数据导入 PostgreSQL 的辅助脚本

## Cloudflare/D1 资料

仓库中仍保留 `DEPLOY_CLOUDFLARE.md`、`wrangler.jsonc`、`prisma/init.sql` 和 D1 迁移 SQL，供历史版本或迁移参考。当前主线不再把 Cloudflare OpenNext 配置纳入 TypeScript 检查，避免在 PostgreSQL standalone 开发时引入无关依赖。
<!-- trigger cloudflare build -->

