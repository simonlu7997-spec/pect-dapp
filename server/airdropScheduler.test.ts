/**
 * 月度 C2Coin 空投定时任务测试
 * 测试范围：
 * 1. 管理员路由权限控制
 * 2. 空投历史查询（仅返回 airdrop_calculate 类型）
 * 3. 权限隔离（普通用户/未登录用户无法操作）
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";

// 固定的测试数据
const MOCK_ADMIN_TX = [
  {
    id: 1,
    txHash: "0xabc123",
    txType: "airdrop_calculate",
    amount: "3",
    status: "confirmed",
    note: "月度空投计算第 1/1 批，3 个地址（scheduler）",
    createdBy: "system",
    createdAt: new Date("2026-04-01T00:05:00Z"),
    confirmedAt: new Date("2026-04-01T00:05:30Z"),
    blockNumber: 35500000,
    errorMessage: null,
  },
  {
    id: 2,
    txHash: "0xdef456",
    txType: "distribute_revenue", // 非空投记录，应被过滤
    amount: "1000",
    status: "confirmed",
    note: "分红发放",
    createdBy: "admin",
    createdAt: new Date("2026-04-01T01:00:00Z"),
    confirmedAt: new Date("2026-04-01T01:00:30Z"),
    blockNumber: 35500100,
    errorMessage: null,
  },
];

// Mock db 模块，避免真实数据库连接
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    listAdminTransactions: vi.fn(),
    getPvcHolderAddresses: vi.fn().mockResolvedValue([]),
    recordAdminTransaction: vi.fn().mockResolvedValue(undefined),
  };
});

// Mock airdropScheduler，避免真实链上调用
vi.mock("./airdropScheduler", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./airdropScheduler")>();
  return {
    ...actual,
    runMonthlyAirdrop: vi.fn().mockResolvedValue({
      success: true,
      totalHolders: 3,
      batches: 1,
      txHashes: ["0xabc123"],
    }),
    startAirdropScheduler: vi.fn(),
    stopAirdropScheduler: vi.fn(),
  };
});

const makeAdminCtx = () => ({
  user: {
    id: 1,
    openId: "owner-open-id",
    name: "Admin",
    email: "admin@test.com",
    role: "admin" as const,
    loginMethod: "oauth" as const,
    lastSignedIn: new Date(),
    updatedAt: new Date(),
  },
  req: {} as never,
  res: {} as never,
});

const makeUserCtx = () => ({
  user: {
    id: 2,
    openId: "user-open-id",
    name: "User",
    email: "user@test.com",
    role: "user" as const,
    loginMethod: "oauth" as const,
    lastSignedIn: new Date(),
    updatedAt: new Date(),
  },
  req: {} as never,
  res: {} as never,
});

describe("adminAirdrop 路由", () => {
  beforeEach(async () => {
    // 每个测试前重置 mock，并设置默认返回值
    const { listAdminTransactions } = await import("./db");
    vi.mocked(listAdminTransactions).mockResolvedValue(MOCK_ADMIN_TX as never);
  });

  describe("triggerAirdrop - 手动触发空投", () => {
    it("管理员可以触发空投计算", async () => {
      const caller = appRouter.createCaller(makeAdminCtx());
      const result = await caller.adminAirdrop.triggerAirdrop();

      expect(result.success).toBe(true);
      expect(result.message).toContain("空投计算任务已启动");
    });

    it("普通用户触发空投应返回 FORBIDDEN 错误", async () => {
      const caller = appRouter.createCaller(makeUserCtx());

      await expect(caller.adminAirdrop.triggerAirdrop()).rejects.toThrow("仅管理员可操作");
    });

    it("未登录用户触发空投应返回 UNAUTHORIZED 错误", async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as never,
        res: {} as never,
      });

      await expect(caller.adminAirdrop.triggerAirdrop()).rejects.toThrow();
    });
  });

  describe("getAirdropHistory - 空投历史查询", () => {
    it("管理员可以查询空投历史，只返回 airdrop_calculate 类型", async () => {
      const caller = appRouter.createCaller(makeAdminCtx());
      const history = await caller.adminAirdrop.getAirdropHistory();

      expect(Array.isArray(history)).toBe(true);
      expect(history.every((tx) => tx.txType === "airdrop_calculate")).toBe(true);
      expect(history.length).toBe(1);
      expect(history[0].txHash).toBe("0xabc123");
    });

    it("空投历史不包含 distribute_revenue 等其他类型的交易记录", async () => {
      const caller = appRouter.createCaller(makeAdminCtx());
      const history = await caller.adminAirdrop.getAirdropHistory();

      const nonAirdrop = history.filter((tx) => tx.txType !== "airdrop_calculate");
      expect(nonAirdrop.length).toBe(0);
    });

    it("空投历史为空时正常返回空数组", async () => {
      const { listAdminTransactions } = await import("./db");
      vi.mocked(listAdminTransactions).mockResolvedValue([]);

      const caller = appRouter.createCaller(makeAdminCtx());
      const history = await caller.adminAirdrop.getAirdropHistory();

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBe(0);
    });

    it("普通用户查询空投历史应返回 FORBIDDEN 错误", async () => {
      const caller = appRouter.createCaller(makeUserCtx());

      await expect(caller.adminAirdrop.getAirdropHistory()).rejects.toThrow("仅管理员可查看");
    });
  });
});
