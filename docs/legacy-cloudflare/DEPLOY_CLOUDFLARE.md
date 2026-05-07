# Cloudflare 免费试用部署说明

本说明用于把“高宏学生管理系统”部署到 Cloudflare Workers + D1，先免费给多人试用。

## 重要提醒

- Cloudflare 会给你一个免费网址，类似 `https://gaohong-student-admin.xxx.workers.dev`。
- `prisma/init.sql` 会清空并重建数据库，只适合第一次初始化或测试重置。
- 试用系统默认账号密码仍是 `admin / admin123`，部署成功后请进入“系统设置”新增自己的管理员账号，并尽快停止使用默认密码。

## 第一步：命令行登录 Cloudflare

在项目目录执行：

```bash
node .tools/package/bin/npm-cli.js exec wrangler login
```

执行后会打开浏览器，请登录 Cloudflare 并允许 Wrangler 访问。

检查是否登录成功：

```bash
node .tools/package/bin/npm-cli.js exec wrangler whoami
```

## 第二步：创建 D1 数据库

```bash
node .tools/package/bin/npm-cli.js exec wrangler d1 create gaohong-student-admin
```

命令执行后会输出类似内容：

```json
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "gaohong-student-admin",
      "database_id": "这里是一串数据库ID"
    }
  ]
}
```

把输出里的 `database_id` 复制到 `wrangler.jsonc`，替换：

```text
REPLACE_WITH_CLOUDFLARE_D1_DATABASE_ID
```

## 第三步：初始化远端数据库

第一次部署前执行：

```bash
node .tools/package/bin/npm-cli.js run cf:d1:init:remote
node .tools/package/bin/npm-cli.js run cf:d1:seed:remote
```

## 第四步：部署到 Cloudflare

```bash
node .tools/package/bin/npm-cli.js run cf:deploy
```

部署成功后，终端会显示一个 `workers.dev` 网址。老师们打开这个网址即可登录试用。

## 后续更新

以后代码有更新时，只需要再次执行：

```bash
node .tools/package/bin/npm-cli.js run cf:deploy
```

不要重复执行 `cf:d1:init:remote`，否则会清空远端数据库。

## 常见问题

### 1. 现在本地的学生数据会自动同步过去吗？

不会。Cloudflare D1 是远端数据库，需要单独初始化。当前说明会写入一份演示数据。

### 2. 可不可以买域名？

可以，但免费试用阶段先用 Cloudflare 给的 `workers.dev` 地址即可。

### 3. 免费额度够用吗？

一般学校内部试用够用。Cloudflare D1 免费版有数据库容量和读写次数限制，如果后续正式长期使用，再评估是否升级或迁移服务器。
