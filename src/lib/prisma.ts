import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createD1Prisma } from "@/lib/d1-prisma";
import type { PrismaClient as LocalPrismaClient } from "@prisma/client";

type D1Env = {
  DB?: D1Database;
};

type AnyPrismaClient = LocalPrismaClient | ReturnType<typeof createD1Prisma>;

const globalForPrisma = globalThis as unknown as {
  localPrisma?: LocalPrismaClient;
  d1Prisma?: ReturnType<typeof createD1Prisma>;
};

function getD1Binding() {
  try {
    const context = getCloudflareContext();
    return (context.env as D1Env).DB;
  } catch {
    return null;
  }
}

async function getPrismaClientAsync(): Promise<AnyPrismaClient> {
  const d1 = getD1Binding();

  if (d1) {
    globalForPrisma.d1Prisma ??= createD1Prisma(d1);
    return globalForPrisma.d1Prisma;
  }

  if (!globalForPrisma.localPrisma) {
    // 动态 import 避免 Cloudflare Worker bundle 引入 node:sqlite
    const { PrismaClient } = await import("@prisma/client");
    globalForPrisma.localPrisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
    });
  }
  return globalForPrisma.localPrisma!;
}

// 同步版本：仅用于类型推断，运行时走 Proxy
function getPrismaClient(): AnyPrismaClient {
  const d1 = getD1Binding();

  if (d1) {
    if (!globalForPrisma.d1Prisma) {
      globalForPrisma.d1Prisma = createD1Prisma(d1);
    }
    return globalForPrisma.d1Prisma;
  }

  // 本地开发：在第一次调用前 localPrisma 可能还没初始化
  // 通过 Proxy 惰性触发异步初始化并缓存
  if (!globalForPrisma.localPrisma) {
    // 这里做一个同步的占位：第一次会走到 proxy 的 get，返回 promise-wrapped 函数
    // 实际上对 Next.js server actions 来说，每次 action 都在同一个 event loop tick 里，
    // 所以只要第一次 action 之前 localPrisma 已经 hydrate 就不会有问题。
    // 为了绝对安全，本地模式下也使用 getPrismaClientAsync()。
    throw new Error("prisma: 本地 PrismaClient 尚未初始化，请通过 getPrismaAsync() 调用");
  }

  return globalForPrisma.localPrisma;
}

// Cloudflare D1 环境：同步 Proxy（d1Prisma 总是可同步获取）
// 本地 SQLite 环境：先调用 initLocalPrisma() 完成初始化
let _initPromise: Promise<void> | null = null;

export async function initLocalPrisma() {
  if (getD1Binding()) return; // D1 环境跳过
  if (globalForPrisma.localPrisma) return; // 已初始化
  if (!_initPromise) {
    _initPromise = getPrismaClientAsync().then(() => {});
  }
  await _initPromise;
}

export const prisma = new Proxy({} as LocalPrismaClient, {
  get(_target, prop, receiver) {
    const d1 = getD1Binding();
    if (d1) {
      globalForPrisma.d1Prisma ??= createD1Prisma(d1);
      return Reflect.get(globalForPrisma.d1Prisma, prop, receiver);
    }

    // 本地环境：如果 localPrisma 还没初始化，尝试同步获取失败会抛错
    // 但实际上 Next.js Server Actions 是异步函数，我们在顶层 layout 或 action 里
    // 可以先 await initLocalPrisma()
    // 简单处理：直接 require（Node.js 环境支持同步 require）
    if (!globalForPrisma.localPrisma) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PrismaClient } = require("@prisma/client");
      globalForPrisma.localPrisma = new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
      });
    }
    return Reflect.get(globalForPrisma.localPrisma!, prop, receiver);
  }
});
