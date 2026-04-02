import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock 数据库
// 使用内存存储模拟 nonce 和用户数据
vi.mock("./db", () => {
  const mockNonces: Array<{ nonce: string; address: string; expiresAt: Date }> = [];
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockImplementation(() => ({
      limit: vi.fn().mockImplementation(() => {
        return Promise.resolve(mockNonces.filter(n => n.expiresAt > new Date()));
      }),
    })),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockImplementation((val: any) => {
      if (val.nonce) {
        mockNonces.push({ nonce: val.nonce, address: val.address || 'pending', expiresAt: val.expiresAt });
      }
      return Promise.resolve([{ id: 1 }]);
    }),
    delete: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  };
  return {
    getDb: vi.fn().mockResolvedValue(mockDb),
    upsertUser: vi.fn().mockResolvedValue(undefined),
    getUserByOpenId: vi.fn().mockResolvedValue(null),
  };
});

// Mock siwe
vi.mock("siwe", () => ({
  SiweMessage: vi.fn().mockImplementation((msg: string) => {
    // 简单解析 address 和 nonce
    const addressMatch = msg.match(/\n(0x[a-fA-F0-9]{40})\n/);
    const nonceMatch = msg.match(/Nonce: ([a-f0-9]+)/);
    return {
      address: addressMatch?.[1] || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      nonce: nonceMatch?.[1] || "testnonce123",
      verify: vi.fn().mockResolvedValue({ success: true }),
    };
  }),
}));

// Mock jose JWT
vi.mock("jose", () => ({
  SignJWT: vi.fn().mockImplementation(() => ({
    setProtectedHeader: vi.fn().mockReturnThis(),
    setIssuedAt: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    sign: vi.fn().mockResolvedValue("mock.jwt.token"),
  })),
  jwtVerify: vi.fn().mockResolvedValue({
    payload: {
      address: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
      name: "0xf39F...2266",
      userId: 1,
    },
  }),
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createMockContext(cookies: Record<string, string> = {}): TrpcContext {
  const setCookies: Record<string, any> = {};
  const clearedCookies: string[] = [];
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
      cookies,
    } as any,
    res: {
      cookie: (name: string, value: string, options: any) => {
        setCookies[name] = { value, options };
      },
      clearCookie: (name: string) => {
        clearedCookies.push(name);
      },
      _setCookies: setCookies,
      _clearedCookies: clearedCookies,
    } as any,
  };
}

const TEST_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

describe("siweAuth.getNonce", () => {
  it("应该为给定地址生成 nonce", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.siweAuth.getNonce({ address: TEST_ADDRESS });

    expect(result).toHaveProperty("nonce");
    expect(typeof result.nonce).toBe("string");
    expect(result.nonce.length).toBeGreaterThan(0);
  });

  it("同一地址重复请求应覆盖旧 nonce", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result1 = await caller.siweAuth.getNonce({ address: TEST_ADDRESS });
    const result2 = await caller.siweAuth.getNonce({ address: TEST_ADDRESS });

    // 两次 nonce 不同（每次重新生成）
    expect(result1.nonce).not.toBe(result2.nonce);
  });
});

describe("siweAuth.verify", () => {
  beforeEach(async () => {
    // 先获取 nonce，确保 nonce 存在
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    await caller.siweAuth.getNonce({ address: TEST_ADDRESS.toLowerCase() });
  });

  it("有效签名应该验证成功并设置 Cookie", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    // 先获取 nonce
    const { nonce } = await caller.siweAuth.getNonce({ address: TEST_ADDRESS.toLowerCase() });

    const message = [
      `localhost wants you to sign in with your Ethereum account:`,
      TEST_ADDRESS,
      "",
      "欢迎登录 PECT DApp",
      "",
      "URI: http://localhost:3000",
      "Version: 1",
      "Chain ID: 80002",
      `Nonce: ${nonce}`,
      `Issued At: ${new Date().toISOString()}`,
    ].join("\n");

    const result = await caller.siweAuth.verify({
      message,
      signature: "0xmocksignature",
    });

    expect(result.success).toBe(true);
    expect(result.address).toBeDefined();
    // Cookie 应该被设置
    expect((ctx.res as any)._setCookies).toHaveProperty("siwe_token");
  });
});

describe("siweAuth.me", () => {
  it("无 Cookie 时应返回 null", async () => {
    const ctx = createMockContext({});
    const caller = appRouter.createCaller(ctx);

    const result = await caller.siweAuth.me();
    expect(result).toBeNull();
  });

  it("有有效 Cookie 时应返回用户信息", async () => {
    const ctx = createMockContext({ siwe_token: "mock.jwt.token" });
    const caller = appRouter.createCaller(ctx);

    const result = await caller.siweAuth.me();
    expect(result).not.toBeNull();
    expect(result?.address).toBe("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266");
  });
});

describe("siweAuth.logout", () => {
  it("应该清除 siwe_token Cookie", async () => {
    const ctx = createMockContext({ siwe_token: "mock.jwt.token" });
    const caller = appRouter.createCaller(ctx);

    const result = await caller.siweAuth.logout();

    expect(result.success).toBe(true);
    expect((ctx.res as any)._clearedCookies).toContain("siwe_token");
  });
});
