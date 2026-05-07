# 高宏学生管理系统部署说明

本文档是当前正式部署路线：Next.js standalone + Prisma + PostgreSQL。适用于 VPS、腾讯云轻量服务器、PM2、Nginx 和 Docker。

## 1. 本地开发

安装依赖：

```bash
npm install
```

创建环境变量：

```bash
cp .env.example .env
```

编辑 `.env`：

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gaohong_student_admin?schema=public"
AUTH_COOKIE_NAME="gaohong_session"
```

初始化数据库并写入演示数据：

```bash
npm run db:init
```

启动开发服务：

```bash
npm run dev
```

浏览器打开：

```text
http://127.0.0.1:3001
```

默认账号：

```text
admin / admin123
```

## 2. 生产构建

生产服务器需要先准备 PostgreSQL，并在 `.env` 中填写真实数据库地址。

安装依赖：

```bash
npm install
```

生成 Prisma Client、构建 Next.js：

```bash
npm run build
```

普通 Node 方式启动：

```bash
npm run start
```

如果要使用 standalone 产物：

```bash
npm run build:standalone
PORT=3001 HOSTNAME=0.0.0.0 npm run start:standalone
```

## 3. PostgreSQL 环境变量示例

本机 PostgreSQL：

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gaohong_student_admin?schema=public"
AUTH_COOKIE_NAME="gaohong_session"
```

云数据库示例：

```bash
DATABASE_URL="postgresql://用户名:密码@数据库地址:5432/数据库名?schema=public"
AUTH_COOKIE_NAME="gaohong_session"
```

首次上线可以执行：

```bash
npm run db:push
npm run db:seed
```

如果数据库里已经有正式数据，不要执行 `npm run db:seed`，避免写入演示数据。

当前 MVP 还没有维护 `prisma/migrations` 目录，因此生产初始化先使用 `npm run db:push`。后续进入正式长期维护后，建议改为 Prisma migration 流程。

## 4. 腾讯云轻量服务器 / VPS 最短上线步骤

登录服务器后安装 Node.js 22、PostgreSQL、Nginx、PM2。

拉取代码：

```bash
git clone https://github.com/jsy137388016-a11y/gaohong-student-admin.git
cd gaohong-student-admin
```

创建 `.env`：

```bash
cp .env.example .env
```

把 `.env` 里的 `DATABASE_URL` 改成服务器 PostgreSQL 地址。

安装依赖并初始化数据库：

```bash
npm install
npm run db:push
npm run db:seed
```

构建并启动：

```bash
npm run build:standalone
pm2 start ecosystem.config.cjs
pm2 save
```

查看运行状态：

```bash
pm2 status
pm2 logs gaohong-student-admin
```

## 5. PM2 启动方式

仓库提供 `ecosystem.config.cjs`。默认监听：

```text
0.0.0.0:3001
```

启动：

```bash
pm2 start ecosystem.config.cjs
pm2 save
```

重启：

```bash
pm2 restart gaohong-student-admin
```

更新代码后：

```bash
git pull
npm install
npm run build:standalone
pm2 restart gaohong-student-admin
```

## 6. Nginx 反向代理示例

新建站点配置，例如 `/etc/nginx/sites-available/gaohong-student-admin`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/gaohong-student-admin /etc/nginx/sites-enabled/gaohong-student-admin
sudo nginx -t
sudo systemctl reload nginx
```

如果暂时没有域名，可以先用服务器公网 IP 访问。

## 7. 可选 Docker 部署

构建镜像时需要提供可访问的 PostgreSQL 地址：

```bash
docker build \
  --build-arg DATABASE_URL="postgresql://用户名:密码@数据库地址:5432/数据库名?schema=public" \
  -t gaohong-student-admin .
```

运行容器：

```bash
docker run -d \
  --name gaohong-student-admin \
  -p 3001:3001 \
  -e DATABASE_URL="postgresql://用户名:密码@数据库地址:5432/数据库名?schema=public" \
  -e AUTH_COOKIE_NAME="gaohong_session" \
  gaohong-student-admin
```

如果数据库还没有表结构，请先在服务器或临时容器里执行 `npm run db:push`。

## 8. 不再使用 Cloudflare Workers

当前主线不再使用：

- `wrangler deploy`
- `.open-next/worker.js`
- Cloudflare D1
- OpenNext Cloudflare Worker 打包

旧资料保存在 `docs/legacy-cloudflare`，仅供历史迁移参考。
