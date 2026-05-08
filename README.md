# 高宏教育三行校区管理系统

这是一个面向高宏教育三行校区的网页版校区管理后台，用于管理学生档案、班级、考勤、纪律、成绩、家校沟通、重点关注和后台账号。

当前主分支按 **PostgreSQL + Next.js standalone** 方向运行，适合部署到 VPS、腾讯云轻量服务器、Docker、PM2 或标准 Node.js 环境。Cloudflare Workers/OpenNext/D1 已不再作为当前主部署方案，历史资料统一保存在 `docs/legacy-cloudflare`。

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

如果要使用 Next.js standalone 产物部署：

```bash
npm run build:standalone
npm run start:standalone
```

完整生产部署步骤见 `DEPLOY.md`。

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
- `DEPLOY.md`：VPS、PM2、Nginx、Docker 部署说明

## 历史 Cloudflare/D1 资料

旧版 Cloudflare Workers/OpenNext/D1 文件已移到 `docs/legacy-cloudflare`，仅供历史参考。当前部署不要使用 `wrangler deploy`，也不再需要 `.open-next/worker.js`。
