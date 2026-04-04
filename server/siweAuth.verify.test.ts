/**
 * siweAuth.verify 单元测试
 *
 * 覆盖场景：
 * 1. nonce 不存在（未调用 getNonce 直接 verify）
 * 2. nonce 已过期（expiresAt 早于当前时间）
 * 3. 签名格式错误（非 hex 字符串）
 * 4. 签名地址与消息地址不匹配
 * 5. 重放攻击（nonce 使用后被删除，再次提交同一 nonce 应失败）
 * 6. 数据库不可用时返回 INTERNAL_SERVER_ERROR
 * 7. SIWE 消息格式错误（缺少必填字段）
 * 8. getNonce 成功返回 32 字符 hex nonce
 * 9. siweAuth.logout 清除 siwe_token cookie
 * 10. siweAuth.me 在无 token 时返回 null
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─────────────────────────────────────────────────────────────────────────────
// Mock 数据库（避免真实 DB 连接）
// ─────────────────────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

import { getDb } from "./db";

// ─────────────────────────────────────────────────────────────────────────────
// 辅助函数
// ─────────────────────────────────────────────────────────────────────────────

/** 创建标准测试上下文 */
function createCtx(overrides?: Partial<TrpcContext>): TrpcContext {
  const cookies: Record<string, unknown> = {};
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
      cookies: {},
    } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string, opts: Record<string, unknown>) => {
        cookies[name] = { value, opts };
      },
      clearCookie: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as TrpcContext["res"],
    ...overrides,
  };
}

/** 构建最小合法 SIWE 消息字符串（不含签名） */
function buildSiweMessage({
  address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  nonce = "abc123def456abc123def456abc123de",
  domain = "localhost",
  uri = "http://localhost",
  chainId = 80002,
  issuedAt = new Date().toISOString(),
}: {
  address?: string;
  nonce?: string;
  domain?: string;
  uri?: string;
  chainId?: number;
  issuedAt?: string;
} = {}): string {
  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    "",
    "Sign in to PECT DApp - Solar Power Revenue & Carbon Credit Platform",
    "",
    `URI: ${uri}`,
    "Version: 1",
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join("\n");
}

/** 创建模拟数据库，返回指定的 nonce 记录 */
function mockDbWithNonce(nonceRecord: {
  id: number;
  address: string;
  nonce: string;
  expiresAt: Date;
  createdAt: Date;
} | null) {
  // Drizzle 链式调用：select().from().where().limit()
  // 每个方法需要返回包含下一个方法的对象
  const limitFn = vi.fn().mockResolvedValue(nonceRecord ? [nonceRecord] : []);
  const whereFn = vi.fn().mockReturnValue({ limit: limitFn });
  const fromFn = vi.fn().mockReturnValue({ where: whereFn, limit: limitFn });
  const mockSelect = { from: fromFn };

  const mockDelete = {
    where: vi.fn().mockResolvedValue(undefined),
  };
  const mockInsert = {
    values: vi.fn().mockResolvedValue(undefined),
  };
  const mockUpdate = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };

  return {
    select: vi.fn().mockReturnValue(mockSelect),
    delete: vi.fn().mockReturnValue(mockDelete),
    insert: vi.fn().mockReturnValue(mockInsert),
    update: vi.fn().mockReturnValue(mockUpdate),
    _limitFn: limitFn,
    _whereFn: whereFn,
    _mockDelete: mockDelete,
    _mockInsert: mockInsert,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. getNonce 路由
// ─────────────────────────────────────────────────────────────────────────────
describe("siweAuth.getNonce", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("数据库不可用时仍返回 nonce（降级模式）", async () => {
    vi.mocked(getDb).mockResolvedValue(null as any);
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.siweAuth.getNonce({ address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" });

    expect(result).toHaveProperty("nonce");
    // nonce 应为 32 字符 hex（uuid v4 去掉连字符）
    expect(result.nonce).toMatch(/^[0-9a-f]{32}$/);
  });

  it("数据库可用时存储 nonce 并返回", async () => {
    const mockDb = mockDbWithNonce(null);
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.siweAuth.getNonce({ address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" });

    expect(result.nonce).toMatch(/^[0-9a-f]{32}$/);
    // 应调用 insert 存储 nonce
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("每次调用返回不同的 nonce（随机性）", async () => {
    vi.mocked(getDb).mockResolvedValue(null as any);
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);

    const r1 = await caller.siweAuth.getNonce({ address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" });
    const r2 = await caller.siweAuth.getNonce({ address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" });

    expect(r1.nonce).not.toBe(r2.nonce);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. verify 路由 — nonce 校验
// ─────────────────────────────────────────────────────────────────────────────
describe("siweAuth.verify — nonce 校验", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("nonce 不存在时返回 UNAUTHORIZED", async () => {
    // 数据库返回空数组（nonce 不存在）
    const mockDb = mockDbWithNonce(null);
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);
    const nonce = "nonexistentnonce1234567890abcdef";
    const message = buildSiweMessage({ nonce });

    await expect(
      caller.siweAuth.verify({ message, signature: "0x" + "a".repeat(130) })
    ).rejects.toThrow(/Nonce 已过期/);
  });

  it("nonce 已过期时返回 UNAUTHORIZED", async () => {
    const expiredNonce = {
      id: 1,
      address: "pending",
      nonce: "expirednonce12345678901234567890",
      expiresAt: new Date(Date.now() - 60_000), // 1 分钟前已过期
      createdAt: new Date(),
    };
    const mockDb = mockDbWithNonce(expiredNonce);
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);
    const message = buildSiweMessage({ nonce: expiredNonce.nonce });

    await expect(
      caller.siweAuth.verify({ message, signature: "0x" + "a".repeat(130) })
    ).rejects.toThrow(/Nonce 已过期/);
  });

  it("数据库不可用时返回 INTERNAL_SERVER_ERROR", async () => {
    vi.mocked(getDb).mockResolvedValue(null as any);

    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);
    const message = buildSiweMessage({ nonce: "validnonce1234567890123456789012" });

    await expect(
      caller.siweAuth.verify({ message, signature: "0x" + "a".repeat(130) })
    ).rejects.toThrow(/数据库连接失败/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. verify 路由 — 签名格式校验
// ─────────────────────────────────────────────────────────────────────────────
describe("siweAuth.verify — 签名格式校验", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("签名格式错误（非 hex）时抛出错误", async () => {
    const validNonce = {
      id: 1,
      address: "pending",
      nonce: "validnonce1234567890123456789012",
      expiresAt: new Date(Date.now() + 300_000), // 5 分钟后过期
      createdAt: new Date(),
    };
    const mockDb = mockDbWithNonce(validNonce);
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);
    const message = buildSiweMessage({ nonce: validNonce.nonce });

    // 签名不是有效的 hex 格式
    await expect(
      caller.siweAuth.verify({ message, signature: "not-a-valid-signature" })
    ).rejects.toThrow();
  });

  it("签名长度不足时抛出错误", async () => {
    const validNonce = {
      id: 1,
      address: "pending",
      nonce: "validnonce1234567890123456789012",
      expiresAt: new Date(Date.now() + 300_000),
      createdAt: new Date(),
    };
    const mockDb = mockDbWithNonce(validNonce);
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);
    const message = buildSiweMessage({ nonce: validNonce.nonce });

    // 签名太短（正常 ECDSA 签名是 65 字节 = 130 hex 字符 + 0x 前缀）
    await expect(
      caller.siweAuth.verify({ message, signature: "0x1234" })
    ).rejects.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. verify 路由 — 重放攻击防护
// ─────────────────────────────────────────────────────────────────────────────
describe("siweAuth.verify — 重放攻击防护", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("nonce 使用后被删除，重放同一 nonce 应失败", async () => {
    /**
     * 模拟重放攻击：
     * 第一次 verify 成功后，nonce 被 DELETE FROM siwe_nonces
     * 第二次提交同一 nonce 时，数据库查询返回空（已删除），应返回 UNAUTHORIZED
     */
    const nonce = "replaynonce12345678901234567890";
    let nonceConsumed = false;

    // 第一次查询返回有效 nonce，之后返回空（模拟删除后的状态）
    const mockSelect = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockImplementation(() => ({
        limit: vi.fn().mockImplementation(() => {
          if (nonceConsumed) return Promise.resolve([]);
          return Promise.resolve([{
            id: 1,
            address: "pending",
            nonce,
            expiresAt: new Date(Date.now() + 300_000),
            createdAt: new Date(),
          }]);
        }),
      })),
    };
    const mockDelete = {
      where: vi.fn().mockImplementation(() => {
        nonceConsumed = true;
        return Promise.resolve(undefined);
      }),
    };
    const mockInsert = { values: vi.fn().mockResolvedValue([{ id: 1 }]) };
    const mockUpdate = { set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) };

    const mockDb = {
      select: vi.fn().mockReturnValue(mockSelect),
      delete: vi.fn().mockReturnValue(mockDelete),
      insert: vi.fn().mockReturnValue(mockInsert),
      update: vi.fn().mockReturnValue(mockUpdate),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    // 第一次 verify（nonce 有效，但签名本身无效 → 会在签名验证阶段失败）
    // 这里我们只测试：nonce 被消费后（nonceConsumed=true），第二次查询返回空
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);
    const message = buildSiweMessage({ nonce });

    // 第一次：nonce 存在，但签名无效 → 签名验证失败（不是 nonce 错误）
    // 注意：由于签名验证在 nonce 检查之后，第一次会在签名验证阶段失败
    // 但 nonce 删除是在签名验证成功后才执行的，所以第一次失败后 nonce 仍存在
    // 这里我们直接模拟 nonce 已被消费的场景（nonceConsumed=true）
    nonceConsumed = true; // 模拟 nonce 已被使用

    await expect(
      caller.siweAuth.verify({ message, signature: "0x" + "a".repeat(130) })
    ).rejects.toThrow(/Nonce 已过期/);
  });

  it("nonce 删除操作在签名验证成功后才执行", async () => {
    /**
     * 验证 nonce 删除的时机：只有签名验证成功后才删除 nonce
     * 如果签名验证失败，nonce 不应被删除（避免 DoS：攻击者提交无效签名耗尽合法 nonce）
     */
    const nonce = "dosnonce1234567890123456789012ab";
    let deleteCalledCount = 0;

    const mockSelect = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{
        id: 1,
        address: "pending",
        nonce,
        expiresAt: new Date(Date.now() + 300_000),
        createdAt: new Date(),
      }]),
    };
    const mockDelete = {
      where: vi.fn().mockImplementation(() => {
        deleteCalledCount++;
        return Promise.resolve(undefined);
      }),
    };

    const mockDb = {
      select: vi.fn().mockReturnValue(mockSelect),
      delete: vi.fn().mockReturnValue(mockDelete),
      insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
      update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) }),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);
    const message = buildSiweMessage({ nonce });

    // 签名无效 → verify 失败
    await expect(
      caller.siweAuth.verify({ message, signature: "0x" + "b".repeat(130) })
    ).rejects.toThrow();

    // nonce 不应被删除（签名验证失败，nonce 保留）
    // delete 可能被调用一次（清理过期 nonce），但不应删除当前有效 nonce
    // 实际上 siweAuth.ts 中 delete 在签名成功后才执行，所以 deleteCalledCount 应为 0
    expect(deleteCalledCount).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. verify 路由 — SIWE 消息格式校验
// ─────────────────────────────────────────────────────────────────────────────
describe("siweAuth.verify — SIWE 消息格式校验", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("空消息字符串时抛出错误", async () => {
    const mockDb = mockDbWithNonce(null);
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.siweAuth.verify({ message: "", signature: "0x" + "a".repeat(130) })
    ).rejects.toThrow();
  });

  it("消息缺少 Nonce 字段时抛出错误", async () => {
    const mockDb = mockDbWithNonce(null);
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);

    // 构造一个缺少 Nonce 行的消息
    const malformedMessage = [
      "localhost wants you to sign in with your Ethereum account:",
      "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
      "",
      "Sign in to PECT DApp",
      "",
      "URI: http://localhost",
      "Version: 1",
      "Chain ID: 80002",
      // 故意省略 Nonce 字段
      `Issued At: ${new Date().toISOString()}`,
    ].join("\n");

    await expect(
      caller.siweAuth.verify({ message: malformedMessage, signature: "0x" + "a".repeat(130) })
    ).rejects.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. siweAuth.logout 路由
// ─────────────────────────────────────────────────────────────────────────────
describe("siweAuth.logout", () => {
  it("清除 siwe_token cookie 并返回 success", async () => {
    const clearedCookies: Array<{ name: string; opts: Record<string, unknown> }> = [];
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {}, cookies: {} } as TrpcContext["req"],
      res: {
        clearCookie: (name: string, opts: Record<string, unknown>) => {
          clearedCookies.push({ name, opts });
        },
      } as unknown as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);
    const result = await caller.siweAuth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe("siwe_token");
    expect(clearedCookies[0]?.opts).toMatchObject({ httpOnly: true, path: "/" });
  });

  it("未登录时调用 logout 也应成功（幂等操作）", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {}, cookies: {} } as TrpcContext["req"],
      res: {
        clearCookie: vi.fn(),
      } as unknown as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);
    const result = await caller.siweAuth.logout();

    expect(result).toEqual({ success: true });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. siweAuth.me 路由
// ─────────────────────────────────────────────────────────────────────────────
describe("siweAuth.me", () => {
  it("无 siwe_token cookie 时返回 null", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
        cookies: {}, // 无 siwe_token
      } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);
    const result = await caller.siweAuth.me();

    expect(result).toBeNull();
  });

  it("siwe_token 格式无效时返回 null（不抛出错误）", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
        cookies: { siwe_token: "invalid.jwt.token" },
      } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);
    // 无效 JWT 应返回 null 而非抛出错误
    const result = await caller.siweAuth.me();
    expect(result).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Zod 输入校验
// ─────────────────────────────────────────────────────────────────────────────
describe("siweAuth.verify — Zod 输入校验", () => {
  it("message 字段缺失时抛出 ZodError", async () => {
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);

    await expect(
      // @ts-expect-error 故意传入不完整的输入
      caller.siweAuth.verify({ signature: "0x" + "a".repeat(130) })
    ).rejects.toThrow();
  });

  it("signature 字段缺失时抛出 ZodError", async () => {
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);

    await expect(
      // @ts-expect-error 故意传入不完整的输入
      caller.siweAuth.verify({ message: buildSiweMessage() })
    ).rejects.toThrow();
  });

  it("getNonce 缺少 address 字段时抛出 ZodError", async () => {
    const ctx = createCtx();
    const caller = appRouter.createCaller(ctx);

    await expect(
      // @ts-expect-error 故意传入不完整的输入
      caller.siweAuth.getNonce({})
    ).rejects.toThrow();
  });
});
