# 高宏学生管理系统 - 项目交接文档

> 本文档用于项目交接，请接手账号仔细阅读。

---

## 一、项目基本信息

| 项目 | 信息 |
|------|------|
| **项目名称** | 高宏学生管理系统 (gaohong-student-admin) |
| **技术栈** | Next.js 15.5 + Prisma + Cloudflare Workers (D1) + OpenNext |
| **当前线上地址** | https://gaohong-student-admin.jsy137388016.workers.dev |
| **Worker 名称** | `gaohong-student-admin` |
| **D1 数据库名称** | `gaohong-student-system-db` |
| **D1 数据库 ID** | `0f571bc1-6a50-45ad-ac39-9dd4825db2cc` |
| **当前部署命令** | `npm run cf:deploy` (实际上是 `npx wrangler deploy`) |

---

## 二、本地运行方式

```bash
# 1. 安装依赖
npm install

# 2. 本地开发（需配置 .dev.vars 或环境变量）
npm run dev

# 3. 构建
npm run build

# 4. 部署到 Cloudflare Workers
npm run cf:deploy
# 或者直接执行：
# npx wrangler deploy

# 5. 查看 D1 数据库
npx wrangler d1 execute gaohong-student-system-db --remote --command "SELECT * FROM Student LIMIT 5"
```

**注意：** 本地开发需要配置 `.dev.vars` 文件（不要提交到 Git），包含：
- `DATABASE_URL` - 本地 SQLite 数据库路径（如 `file:./prisma/dev.db`）
- 其他敏感配置

---

## 三、数据库说明

### 3.1 Schema 文件位置

| 文件 | 位置 | 说明 |
|------|------|------|
| Prisma Schema | `prisma/schema.prisma` | 主数据模型定义 |
| 初始化 SQL | `prisma/init.sql` | D1 初始化脚本（CREATE TABLE） |
| 迁移 SQL | `prisma/migrate-*.sql` | 各阶段迁移脚本 |

### 3.2 当前表结构

| 表名 | 说明 | 主要字段 |
|------|------|----------|
| **User** | 用户表 | id, username, passwordHash, name, role |
| **ClassRoom** | 班级表 | id, name, grade, headTeacher, status (active/inactive) |
| **Student** | 学生表 | id, name, gender, grade, phone, parentName, parentPhone, boardingStatus, classId, status, isFocus, artMajor |
| **Attendance** | 考勤表 | id, studentId, date, type, period, description, recorder |
| **Discipline** | 纪律表 | id, studentId, violationType, description, result, deductScore, parentNotified, follower, recordedAt |
| **Exam** | 考试表 | id, name, examDate, grade, type |
| **Score** | 成绩表 | id, examId, studentId, classId, subject, score, fullScore |
| **Communication** | 家校沟通表 | id, studentId, target, method, content, parentFeedback, followUp, communicator, contactedAt |
| **GuaranteeLetter** | 保证书表 | id, studentId, fileName, fileType, fileSize, fileUrl, remark, uploadedBy, createdAt |
| **WarningRecord** | 预警记录表 | id, studentId, level, warningType, reason, status |

### 3.3 迁移 SQL 文件清单

| 文件 | 说明 | 状态 |
|------|------|------|
| `init.sql` | 初始化所有表结构 | ✅ 已执行 |
| `migrate-add-class-status.sql` | 班级表添加 status 字段 | ✅ 已执行 |
| `migrate-add-studentno-examtype.sql` | 学生表添加 studentNo，考试表添加 type | ✅ 已执行 |
| `upgrade-focus.sql` | 学生表添加关注标记字段 | ✅ 已执行 |
| `migrate-score-to-subject.sql` | 成绩表从宽表改为 subject 模式 | ✅ 已执行 |
| `migrate-add-deduct-score.sql` | 纪律表添加 deductScore 字段 | ✅ 已执行 |
| `migrate-add-guarantee-letter.sql` | 新建 GuaranteeLetter 表 | ✅ 已执行 |
| `seed-cloudflare.sql` | 初始数据种子 | ✅ 已执行 |

**重要：** D1 数据库不支持 Prisma migrate，所有迁移需手动执行 SQL。

### 3.4 执行迁移命令

```bash
# 执行单个迁移
npx wrangler d1 execute gaohong-student-system-db --remote --file=./prisma/migrate-xxx.sql

# 查看当前表结构
npx wrangler d1 execute gaohong-student-system-db --remote --command "SELECT sql FROM sqlite_master WHERE type='table'"
```

---

## 四、当前已完成功能

| 功能 | 页面路径 | 状态 |
|------|----------|------|
| ✅ 登录 | `/login` | 完成 |
| ✅ 学生管理（列表） | `/students` | 完成（无分页） |
| ✅ 学生详情页 | `/students/[id]` | 完成（含违纪记录、保证书） |
| ✅ 学生编辑 | `/students/[id]/edit` | 完成 |
| ✅ 班级管理 | `/classes` | 完成 |
| ✅ 班级详情 | `/classes/[id]` | 完成 |
| ✅ 班级编辑 | `/classes/[id]/edit` | 完成 |
| ✅ 考勤管理 | `/attendance` | 完成 |
| ✅ 纪律管理 | `/discipline` | 完成 |
| ✅ 成绩管理（考试列表） | `/exams` | 完成 |
| ✅ 成绩详情（导入） | `/exams/[id]` | 完成（支持 Excel 导入） |
| ✅ 违纪扣分 | `/discipline` + `/students/[id]` | 完成 |
| ✅ 保证书留档 | `/students/[id]` | 完成 |
| ✅ 家校沟通 | `/communications` | 页面完成（功能待验证） |
| ✅ 重点关注 | `/focus` | 页面完成（功能待验证） |
| ✅ 系统设置 | `/settings` | 页面完成（功能待验证） |

---

## 五、当前未完成/待修问题

### 5.1 P0 - 必须马上修

| 问题 | 描述 | 状态 |
|------|------|------|
| **学生详情页缓存问题** | 删除违纪记录后页面仍显示旧数据，已添加 `export const dynamic = "force-dynamic"` 修复，部署中 | ⏳ 待验证 |
| **学生详情页新增违纪按钮** | 点击"新增违纪"按钮无响应（DisciplineForm 组件），可能需要进一步排查 | ❌ 待修 |
| **侧边栏导航不跳转** | 点击左侧导航链接（如"考勤管理"）页面不跳转，需手动输入 URL | ❌ 待修 |

### 5.2 P1 - 近期修

| 问题 | 描述 |
|------|------|
| 学生管理分页 | 334 条学生记录无分页，表格极长 |
| 学生选择器搜索 | 考勤/纪律管理学生下拉 300+ 选项，无搜索功能 |
| 删除按钮视觉 | 红色"删除"按钮视觉突兀，建议改图标或操作菜单 |
| 手机号显示格式 | 显示"无 15956018078"格式不友好 |
| 违纪描述列显示 | 显示扣分值而非描述文字 |

### 5.3 P2 - 后期优化

| 问题 | 描述 |
|------|------|
| 首页看板 UI | 快捷链接纯文字，建议美化 |
| Excel 导入体验 | 当前需手动选择文件，可优化 |
| 保证书文件上传 | 当前仅存元数据，实际文件存储待实现（R2） |
| 权限控制 | 当前仅登录验证，无细粒度权限 |

---

## 六、接手账号优先任务

### P0（必须马上修）

1. **验证部署是否生效** - 访问 `/students/6` 确认违纪记录删除功能正常
2. **排查 DisciplineForm 组件** - 检查为什么"新增违纪"按钮点击无响应
3. **修复侧边栏导航** - 检查 DashboardLayout 组件中的导航链接事件

### P1（近期修）

1. **添加学生分页** - `/students` 页面添加分页组件
2. **学生选择器搜索** - 使用 Combobox 或 Autocomplete 组件
3. **优化删除按钮** - 改为图标按钮或下拉菜单

### P2（后期优化）

1. 首页看板设计
2. 权限系统
3. R2 文件存储集成

---

## 七、重要业务规则

| 规则 | 说明 |
|------|------|
| **学生软删除** | 学生不要物理删除，使用 `status: "inactive"` 软删除 |
| **班级停用** | 班级不要物理删除，使用 `status: "inactive"` 停用 |
| **违纪基础分** | 违纪基础分 20 分，扣分后计算剩余分（≥15 正常，≤15 预警，≤0 重点关注） |
| **成绩 3+1+2 规则** | 语数外 3 科 + 物理/历史 1 科 + 化学/生物/政治/地理 2 科 |
| **外语三选一** | 外语为英语/日语/俄语三选一，不重复 |
| **空成绩不算错误** | 成绩导入时，只导入有分数的科目，空成绩跳过 |
| **Server Action 必须 try/catch** | 所有 Server Action/API 必须 try/catch，不能出现 Application Error |
| **动态页面必须配置** | 所有需要实时数据的页面必须添加 `export const dynamic = "force-dynamic"` |

---

## 八、敏感信息提醒

### ⚠️ 不要打包以下文件

| 文件 | 原因 |
|------|------|
| `.env` | 可能含敏感配置 |
| `.env.local` | 本地敏感配置 |
| `.dev.vars` | Cloudflare 本地开发配置（含数据库 URL） |
| `prisma/dev.db` | 本地 SQLite 数据库（含测试数据） |
| `*.sqlite` | 所有 SQLite 数据库文件 |
| `.wrangler/` | Wrangler 缓存（含本地状态） |
| `node_modules/` | 可通过 npm install 恢复 |
| `.next/` | 构建产物，可重新生成 |
| `.open-next/` | 构建产物 |
| `.git/` | Git 历史（除非需要版本历史） |

### ⚠️ 不要在文档中写入

- Cloudflare API Token
- GitHub Token
- 任何账号密码
- 数据库连接字符串（含密码）

### ✅ 需要重新配置

接手账号需要在 Cloudflare 控制台：
1. 创建新的 D1 数据库或使用现有数据库
2. 创建新的 Worker 或使用现有 Worker
3. 配置 `wrangler.jsonc` 中的数据库 ID
4. 配置环境变量（如登录密码哈希）

---

## 九、关键代码文件说明

| 文件 | 说明 |
|------|------|
| `src/lib/prisma.ts` | Prisma Client 初始化 |
| `src/lib/d1-prisma.ts` | D1 专用 Prisma 适配器（**必须注册所有新表**） |
| `src/lib/auth.ts` | 认证逻辑（requireUser, login, logout） |
| `src/components/dashboard-layout.tsx` | 左侧导航栏 |
| `src/components/ui.tsx` | UI 组件库（**必须有 "use client" 指令**） |
| `src/app/students/[id]/page.tsx` | 学生详情页（**必须有 dynamic = "force-dynamic"**） |
| `src/app/students/[id]/DisciplineForm.tsx` | 违纪表单组件 |
| `src/app/students/[id]/GuaranteeLetterForm.tsx` | 保证书表单组件 |
| `src/app/students/[id]/DeleteDisciplineButton.tsx` | 违纪删除按钮 |
| `src/app/students/[id]/discipline-actions.ts` | 违纪相关 Server Actions |

---

## 十、常见问题排查

### Q: 页面显示 "Application error"

**排查步骤：**
1. 运行 `npx wrangler tail` 查看实时日志
2. 检查是否有 `Event handlers cannot be passed to Client Component props` 错误
3. 确认包含 onClick/onChange 的组件有 `"use client"` 指令
4. 确认 Server Action 有 try/catch

### Q: 数据修改后页面不更新

**排查步骤：**
1. 确认页面有 `export const dynamic = "force-dynamic"`
2. 确认 Server Action 中有 `revalidatePath()`
3. 检查 D1 数据库是否真正更新

### Q: Prisma 查询报 undefined

**排查步骤：**
1. 检查 `d1-prisma.ts` 中是否注册了该表
2. 检查 Prisma schema 是否有该模型定义
3. 检查 D1 数据库是否创建了该表

---

## 十一、交接确认清单

接手账号请确认：

- [ ] 已收到 zip 文件并解压
- [ ] 已阅读本 HANDOFF.md 文档
- [ ] 已在 Cloudflare 创建/配置 Worker 和 D1 数据库
- [ ] 已运行 `npm install` 安装依赖
- [ ] 已运行 `npm run build` 确认构建通过
- [ ] 已运行 `npm run cf:deploy` 部署成功
- [ ] 已访问线上地址确认页面正常
- [ ] 已确认登录功能正常
- [ ] 已确认学生管理页面正常
- [ ] 已确认学生详情页违纪/保证书功能正常

---

**交接时间：** 2026-05-05
**交接版本：** gaohong-student-admin latest
**Build 状态：** ✅ 通过
**部署状态：** ✅ 最新版本已部署

---

如有疑问，请参考项目 README.md 和 DEPLOY_CLOUDFLARE.md。