#!/usr/bin/env node
// patch-prisma-binary.mjs
// 在 opennext build 之后、wrangler deploy 之前执行。
// 把 .open-next 里所有打包好的 bundle 中的
// require("node:sqlite") 替换为抛出异常的 stub，
// 避免 Cloudflare Workers 打包时报错。
// 在 Cloudflare Workers 运行时，数据库操作走的是 d1-prisma.ts 里的 D1 实现，
// 所以 SqliteCacheStore 实际上永远不会被实例化。

import { readFile, writeFile } from "node:fs/promises";
import { globSync } from "node:fs";
import path from "node:path";

// 需要 patch 的文件列表（相对于项目根目录）
const TARGET_PATTERNS = [
  ".open-next/**/node_modules/@prisma/client/runtime/binary.js",
  ".open-next/**/handler.mjs",
];

const SQLITE_REQUIRE = /require\(["']node:sqlite["']\)/g;
const SQLITE_STUB =
  '({ DatabaseSync: function DatabaseSync() { throw new Error("node:sqlite is not available in Cloudflare Workers"); } })';

async function main() {
  const cwd = process.cwd();
  let patchedCount = 0;

  for (const pattern of TARGET_PATTERNS) {
    // Node 22 globSync 实验性 API
    let files;
    try {
      files = globSync(pattern, { cwd });
    } catch {
      // fallback: 用 node:fs 手动找
      const { readdirSync, statSync } = await import("node:fs");
      files = [];
      const base = pattern.split("*")[0];
      const walkDir = (dir) => {
        for (const f of readdirSync(path.join(cwd, dir), { withFileTypes: true })) {
          const rel = `${dir}/${f.name}`;
          if (f.isDirectory()) walkDir(rel);
          else if (f.name.endsWith(".mjs") || f.name.endsWith(".js")) files.push(rel);
        }
      };
      try { walkDir(base); } catch {}
    }

    for (const file of files) {
      const fullPath = path.resolve(cwd, file);
      let content;
      try {
        content = await readFile(fullPath, "utf-8");
      } catch {
        continue;
      }

      if (!content.includes("node:sqlite")) {
        continue;
      }

      const patched = content.replace(SQLITE_REQUIRE, SQLITE_STUB);
      await writeFile(fullPath, patched, "utf-8");
      console.log(`patch-prisma-binary: ✅ 已 patch ${file}`);
      patchedCount++;
    }
  }

  if (patchedCount === 0) {
    console.log("patch-prisma-binary: 未找到含 node:sqlite 的文件，跳过。");
  } else {
    console.log(`patch-prisma-binary: 共 patch 了 ${patchedCount} 个文件。`);
  }
}

main().catch((err) => {
  console.error("patch-prisma-binary 失败:", err);
  process.exit(1);
});
