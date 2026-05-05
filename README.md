# 高宏学生管理系统 MVP

这是一个基于 Next.js、TypeScript、SQLite、Prisma、Tailwind CSS 的网页版学生管理后台。

## 运行步骤

1. 安装依赖

```bash
node .tools/package/bin/npm-cli.js install
```

如果你电脑后面装好了 npm，也可以使用：

```bash
npm install
```

2. 创建环境变量

```bash
cp .env.example .env
```

3. 初始化数据库并写入演示数据

```bash
node .tools/package/bin/npm-cli.js run db:init
```

4. 启动系统

```bash
node .tools/package/bin/npm-cli.js run dev
```

浏览器打开：http://127.0.0.1:3001

## 默认账号

- 账号：admin
- 密码：admin123

## 批量导入学生

进入“学生管理”，点击“下载CSV模板”，用 Excel 打开并填写学生信息，然后另存为 CSV 文件，再回到系统上传导入。

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

## 免费试用部署

Cloudflare Workers + D1 免费试用部署步骤见：

```text
DEPLOY_CLOUDFLARE.md
```

## 主要目录

- `src/app`：页面和业务操作
- `src/components`：后台布局和通用组件
- `src/lib`：数据库、登录、表单工具
- `prisma/schema.prisma`：数据库模型
- `prisma/seed.ts`：初始化数据
