import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock 数据库（避免真实 DB 调用影响测试结果）
vi.mock("./db", () => ({
  createKycApplication: vi.fn().mockResolvedValue({ insertId: 1 }),
  getKycByWallet: vi.fn().mockResolvedValue(undefined), // 默认无记录
  updateKycStatus: vi.fn().mockResolvedValue(undefined),
  listKycApplications: vi.fn().mockResolvedValue([]),
  recordTransaction: vi.fn().mockResolvedValue(undefined),
  getTransactionsByWallet: vi.fn().mockResolvedValue([]),
  updateTransactionStatus: vi.fn().mockResolvedValue(undefined),
  bindWallet: vi.fn().mockResolvedValue(undefined),
  getWalletsByUserId: vi.fn().mockResolvedValue([]),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(null),
}));
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock ethers
vi.mock("ethers", () => {
  const mockContract = {
    isKycVerified: vi.fn().mockResolvedValue(false),
    isSenderWhitelisted: vi.fn().mockResolvedValue(false),
    addKyc: vi.fn().mockResolvedValue({ hash: "0xabc123", wait: vi.fn().mockResolvedValue(true) }),
    addSenderWhitelist: vi.fn().mockResolvedValue({ hash: "0xdef456", wait: vi.fn().mockResolvedValue(true) }),
  };

  return {
    ethers: {
      JsonRpcProvider: vi.fn().mockImplementation(() => ({})),
      Wallet: vi.fn().mockImplementation(() => ({ address: "0xdeployer" })),
      Contract: vi.fn().mockImplementation(() => mockContract),
      isAddress: vi.fn().mockReturnValue(true),
    },
  };
});

// Mock notification
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

function createTestContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("whitelist router", () => {
  beforeEach(() => {
    // 设置环境变量
    process.env.PV_COIN_ADDRESS = "0x1234567890123456789012345678901234567890";
    process.env.DEPLOYER_PRIVATE_KEY = "0x" + "a".repeat(64);
    process.env.BLOCKCHAIN_RPC_URL = "https://rpc-amoy.polygon.technology";
  });

  it("checkStatus - 返回未在白名单的状态", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.whitelist.checkStatus({
      walletAddress: "0x1234567890123456789012345678901234567890",
    });

    expect(result).toHaveProperty("contractConfigured");
  });

  it("submit - 验证输入格式", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // 测试无效的钱包地址
    await expect(
      caller.whitelist.submit({
        fullName: "测试用户",
        email: "test@example.com",
        phone: "13800138000",
        country: "CN",
        investmentAmount: "10000",
        investmentCurrency: "USDT",
        walletAddress: "invalid-address",
      })
    ).rejects.toThrow();
  });

  it("submit - 验证邮箱格式", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // 测试无效的邮箱
    await expect(
      caller.whitelist.submit({
        fullName: "测试用户",
        email: "invalid-email",
        phone: "13800138000",
        country: "CN",
        investmentAmount: "10000",
        investmentCurrency: "USDT",
        walletAddress: "0x1234567890123456789012345678901234567890",
      })
    ).rejects.toThrow();
  });

  it("submit - 成功提交白名单申请", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.whitelist.submit({
      fullName: "测试用户",
      email: "test@example.com",
      phone: "13800138000",
      country: "CN",
      investmentAmount: "10000",
      investmentCurrency: "USDT",
      walletAddress: "0x1234567890123456789012345678901234567890",
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("申请已提交");
  });
});
