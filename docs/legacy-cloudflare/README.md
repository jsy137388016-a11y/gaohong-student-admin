# Cloudflare / OpenNext / D1 历史资料

本目录保存旧版 Cloudflare Workers + OpenNext + D1 部署链路的参考文件。

当前项目主线已经统一为 PostgreSQL + Next.js standalone，适合部署到 VPS、腾讯云轻量服务器、Docker、PM2 或标准 Node.js 环境。根目录不再保留 `wrangler.jsonc` 和 `open-next.config.ts`，避免 Cloudflare 构建器误判当前项目还需要 `.open-next/worker.js`。

目录内容：

- `wrangler.jsonc`：旧 Worker 部署配置
- `open-next.config.ts`：旧 OpenNext Cloudflare 配置
- `DEPLOY_CLOUDFLARE.md`：旧 Cloudflare 免费试用说明
- `schema.cloudflare.prisma`：旧 D1/SQLite Prisma schema
- `d1-prisma.ts`：旧 D1 数据访问适配器
- `prisma-stub.js`：旧 Worker 打包 stub
- `sql/`：旧 D1 初始化和迁移 SQL
- `scripts/`：旧 D1 导出和 OpenNext 打包辅助脚本
- `types/`：旧 Cloudflare Worker 类型声明
- `HANDOFF.md`、`HANDOFF_TO_QCOLW.md`：旧部署交接记录，其中包含当时的 Cloudflare 部署命令

除非明确要恢复 Cloudflare Workers 路线，否则不要把这些文件移回仓库根目录或主源码目录。
