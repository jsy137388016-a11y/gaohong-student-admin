# 交接文档 — gaohong-student-admin

> 交接给：Qcolw
> 日期：2026-05-05
> 项目状态：构建通过 ✅，可继续开发

---

## 1. 项目基本信息

| 项目 | 内容 |
|------|------|
| 项目名称 | 郯城一中学生管理系统 |
| 技术栈 | Next.js 15 + React 19 + TypeScript + Tailwind CSS + Prisma 6 + Cloudflare Workers + D1 |
| 当前线上地址 | https://gaohong-student-admin.jsy137388016.workers.dev |
| 当前部署方式 | `npm run cf:deploy`（opennextjs-cloudflare） |
| Cloudflare Worker 名称 | `gaohong-student-admin` |
| Cloudflare D1 数据库名称 | `gaohong-student-system-db` |
| D1 数据库 ID | `0f571bc1-6a50-45ad-ac39-9dd4825db2cc` |

---

## 2. 本地运行方式

```bash
# 安装依赖
npm install

# 本地开发（localhost:3001）
npm run dev

# 构建（必须先在 wrangler.jsonc 里把 database_id 改成本地 DB ID，或直接用远程 D1）
npm run build

# 部署到 Cloudflare Workers
npm run cf:deploy
```

---

## 3. 数据库说明

### Prisma Schema 文件
- 本地开发：`prisma/schema.prisma`（SQLite）
- Cloudflare D1：`prisma/schema.cloudflare.prisma`

### 当前表结构摘要

#### ClassRoom（班级）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int | 自增主键 |
| name | String | 班级名称 |
| grade | String | 年级 |
| headTeacher | String | 班主任 |
| remark | String? | 备注 |
| status | String | 状态，默认 "active"，停用后为 "inactive" |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

#### Student（学生）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int | 自增主键 |
| studentNo | String? | 学号 |
| name | String | 学生姓名 |
| gender | Gender | male/female |
| grade | String | 年级 |
| phone | String? | 学生电话 |
| parentName | String | 家长姓名 |
| parentPhone | String | 家长电话 |
| boardingStatus | BoardingStatus | boarding/day_student |
| status | String | 状态，默认 "active"，退学为 "withdrawn"，转班后会变更 classId |
| artMajor | String? | 艺术方向 |
| remark | String? | 备注 |
| isFocus | Boolean | 是否重点关注 |
| focusNote | String? | 关注备注 |
| focusMarkedBy | String? | 标记人 |
| focusMarkedAt | DateTime? | 标记时间 |
| classId | Int? | 所属班级（外键 → ClassRoom.id） |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

#### Exam（考试）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int | 自增主键 |
| name | String | 考试名称 |
| examDate | DateTime | 考试日期 |
| grade | String | 适用年级 |
| type | String | 考试类型：月考/模拟考/周测/限时训练/日常测验 |
| remark | String? | 备注 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

#### Score（成绩）—— 已改造为 subject 模式 ✅
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int | 自增主键 |
| examId | Int | 考试 ID（外键 → Exam.id） |
| studentId | Int | 学生 ID（外键 → Student.id） |
| classId | Int? | 班级 ID（外键 → ClassRoom.id），允许 null |
| subject | String | 科目：语文/数学/英语/日语/俄语/物理/历史/化学/生物/政治/地理 |
| score | Float | 得分，默认 0 |
| fullScore | Float | 满分，默认 0（语文/数学/外语=150，其他=100） |
| remark | String? | 备注 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

唯一约束：`@@unique([examId, studentId, subject])`

---

### 迁移 SQL 文件清单

| 文件 | 说明 |
|------|------|
| `prisma/init.sql` | 初始建表 SQL（本地 SQLite / 远程 D1 均可执行） |
| `prisma/migrate-add-class-status.sql` | 给 ClassRoom 表添加 status 字段（软删除/停用） |
| `prisma/migrate-add-studentno-examtype.sql` | 给 Student 添加 studentNo；给 Exam 添加 type |
| `prisma/migrate-score-to-subject.sql` | 将旧 Score 表（语文/数学/英语...列模式）迁移为 subject 行模式 |
| `prisma/upgrade-focus.sql` | 添加重点关注相关字段（isFocus/focusNote/focusMarkedBy/focusMarkedAt） |
| `prisma/seed-cloudflare.sql` | 远程 D1  seed 数据（班级+学生+考试） |

### 迁移执行状态

- ✅ `init.sql` — 已执行（初始建表）
- ✅ `migrate-add-class-status.sql` — 已执行
- ✅ `migrate-add-studentno-examtype.sql` — 已执行
- ⚠️ `migrate-score-to-subject.sql` — 已执行（旧列已删除，subject 模式已生效）
- ✅ `upgrade-focus.sql` — 已执行
- `seed-cloudflare.sql` — 可选执行（远程 D1 初始化数据）

---

## 4. 最近已完成的功能

- ✅ 班级软删除/停用（status 字段，非物理删除）
- ✅ 学生退学（status 改为 "withdrawn"，非物理删除）
- ✅ 学生换班（更新 classId，非物理删除）
- ✅ 学生 Excel 批量导入（支持 xlsx/xls/csv，姓名+电话+家长电话必填，重复性校验）
- ✅ 成绩表结构改造：从多列模式改为 subject 行模式
- ✅ 班级详情页右上角添加"下载本班成绩模板"和"导入本班成绩"按钮
- ✅ Server Action 全部增加 try/catch，避免 Application error
- ✅ UI 优化：按钮样式统一、间距优化

---

## 5. 当前未完成 / 需要继续开发的问题

1. **班级详情页成绩导入闭环未完成**
   - 下载本班成绩模板 → 上传 Excel → 预览校验 → 确认导入 → 成绩管理可查看
   - 当前"导入本班成绩"按钮已显示，但导入逻辑需要对接最新 subject 模式

2. **成绩导入 Excel 解析**
   - 需要支持 Excel 上传并解析
   - 支持 3+1+2 规则校验
   - 外语三选一（英语/日语/俄语），填了多项才算错误
   - 空科目不报错，只导入有分数的科目
   - 分数超过满分才算错误

3. **成绩管理页面**
   - 导入成绩后要在成绩管理页面可查看
   - 按考试、班级、学生多维筛选

4. **UI 持续优化**
   - 班级详情页整体布局
   - 学生列表页筛选和分页
   - 移动端适配

5. **不允许出现 Application error**
   - 所有 Server Action / API 必须有 try/catch
   - 所有错误要在页面显示，不能白屏

---

## 6. Qcolw 接手后的优先任务

### 第一优先：确认构建通过
```bash
npm run build
```
如果不通过，先修复构建错误再继续。

### 第二优先：确认班级详情页按钮已挂载
检查 `src/app/classes/[id]/page.tsx`：
- 是否已引入 `ClassScoreImportButtons`
- 右上角是否有："返回班级 | 编辑班级 | 下载本班成绩模板 | 导入本班成绩"

### 第三优先：完成成绩导入闭环
1. 点击"下载本班成绩模板" → 下载 Excel 模板（包含本班所有学生）
2. 点击"导入本班成绩" → 弹出模态框 → 选择考试 → 上传 Excel → 预览校验 → 确认导入
3. 导入后成绩写入 `Score` 表（subject 模式）
4. 在"成绩管理"页面可以查到导入的成绩

### 第四优先：优化 UI
- 班级详情页整体布局和视觉优化
- 学生列表页优化
- 移动端响应式适配

---

## 7. 成绩导入业务规则（重要！）

### 科目列表
语文、数学、英语、日语、俄语、历史、物理、地理、政治、生物、化学

### 满分规则
- 语文、数学、外语（英语/日语/俄语）：满分 **150**
- 历史、物理、地理、政治、生物、化学：满分 **100**

### 3+1+2 规则
- **3**：语文、数学、外语（必考）
- **1**：物理/历史 **二选一**
- **2**：化学/生物/政治/地理 **四选二**

### 外语规则
- 英语/日语/俄语 **三选一**
- 只填了其中一项或两项：✅ 正常
- 三项都填了：❌ 报错

### 空成绩处理
- 某科目单元格为空：✅ 不算错误，跳过该科目，不导入
- 只导入有分数的科目

### 分数合法性
- 分数超过满分：❌ 报错（如语文 160 分）
- 分数为负数：❌ 报错

---

## 8. 注意事项（重要！）

1. **不要物理删除学生**
   - 退学：把 `status` 改为 `"withdrawn"`
   - 换班：更新 `classId`
   - 删除：不要物理 DELETE

2. **不要物理删除班级**
   - 停用：把 `status` 改为 `"inactive"`
   - 删除：不要物理 DELETE

3. **所有 Server Action / API 必须 try/catch**
   - 捕获错误后返回一个 `{ success, error }` 对象
   - 在页面上用 `useFormState` 或 `useState` 显示错误信息
   - **不允许出现 Application error 白屏**

4. **不要上传敏感文件到 Git**
   - `.env`、`.env.local`、`.dev.vars`：包含敏感信息，已加入 .gitignore
   - `prisma/dev.db`、`*.sqlite`：本地数据库文件
   - `node_modules`、`.next`、`.open-next`、`.wrangler`：依赖和构建产物

---

## 9. 关键文件路径速查

| 功能 | 文件路径 |
|------|----------|
| 班级列表页 | `src/app/classes/page.tsx` |
| 班级详情页 | `src/app/classes/[id]/page.tsx` |
| 成绩导入按钮组件 | `src/app/classes/[id]/score-import-client.tsx` |
| 学生列表页 | `src/app/students/page.tsx` |
| 学生批量导入 | `src/app/students/import-client.tsx` |
| 成绩管理页 | `src/app/exams/[id]/page.tsx` |
| Prisma Schema（本地） | `prisma/schema.prisma` |
| Prisma Schema（Cloudflare） | `prisma/schema.cloudflare.prisma` |
| 部署配置 | `wrangler.jsonc` |
| OpenNext 配置 | `open-next.config.ts` |
| Cloudflare 部署说明 | `DEPLOY_CLOUDFLARE.md` |

---

## 10. 联系方式

如有疑问，联系大哥（项目负责人）进一步确认需求。

祝开发顺利！🎉
