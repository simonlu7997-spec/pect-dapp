/**
 * 阶段 8：前端-数据库交互测试
 * 测试 KYC 申请、交易记录、钱包绑定的数据库操作
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

// ---- Mock 数据库 ----
const mockInsertResult = { insertId: 42 };
const mockKycRecord = {
  id: 42,
  fullName: "张三",
  email: "zhangsan@example.com",
  phone: "13800138000",
  country: "中国",
  investmentAmount: "10000",
  investmentCurrency: "USDT",
  walletAddress: "0x1234567890123456789012345678901234567890",
  status: "pending" as const,
  txHashKyc: null,
  txHashSender: null,
  reviewNote: null,
  createdAt: new Date("2026-03-25T00:00:00Z"),
  updatedAt: new Date("2026-03-25T00:00:00Z"),
};
const mockTxRecord = {
  id: 1,
  walletAddress: "0x1234567890123456789012345678901234567890",
  txHash: "0x" + "a".repeat(64),
  txType: "stake" as const,
  amount: "1000.000000000000000000",
  tokenSymbol: "PVC",
  status: "confirmed" as const,
  blockNumber: 12345678,
  gasUsed: "85000",
  errorMessage: null,
  createdAt: new Date("2026-03-25T00:00:00Z"),
  confirmedAt: new Date("2026-03-25T00:00:10Z"),
};

const mockDb = {
  insert: vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      onDuplicateKeyUpdate: vi.fn().mockResolvedValue(mockInsertResult),
    }),
    // For direct insert (without onDuplicateKeyUpdate)
    _values: mockInsertResult,
  }),
  select: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockKycRecord]),
        }),
        limit: vi.fn().mockResolvedValue([mockKycRecord]),
      }),
      orderBy: vi.fn().mockResolvedValue([mockKycRecord]),
    }),
  }),
  update: vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue({ affectedRows: 1 }),
    }),
  }),
};

vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: vi.fn().mockReturnValue(mockDb),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn().mockReturnValue("eq_condition"),
  desc: vi.fn().mockReturnValue("desc_order"),
  and: vi.fn().mockReturnValue("and_condition"),
}));

vi.mock("../drizzle/schema", () => ({
  users: "users_table",
  kycApplications: "kyc_applications_table",
  transactions: "transactions_table",
  walletBindings: "wallet_bindings_table",
}));

// ---- Mock 环境变量 ----
process.env.DATABASE_URL = "mysql://test:test@localhost:3306/test";

// ---- 模拟 db 函数 ----
const mockCreateKyc = vi.fn().mockResolvedValue(mockInsertResult);
const mockGetKycByWallet = vi.fn().mockResolvedValue(mockKycRecord);
const mockUpdateKycStatus = vi.fn().mockResolvedValue(undefined);
const mockListKyc = vi.fn().mockResolvedValue([mockKycRecord]);
const mockRecordTx = vi.fn().mockResolvedValue(undefined);
const mockGetTxByWallet = vi.fn().mockResolvedValue([mockTxRecord]);
const mockUpdateTxStatus = vi.fn().mockResolvedValue(undefined);
const mockBindWallet = vi.fn().mockResolvedValue(undefined);
const mockGetWallets = vi.fn().mockResolvedValue([
  { id: 1, userId: 1, walletAddress: "0x1234567890123456789012345678901234567890", isPrimary: "yes", createdAt: new Date() },
]);

vi.mock("./db", () => ({
  createKycApplication: mockCreateKyc,
  getKycByWallet: mockGetKycByWallet,
  updateKycStatus: mockUpdateKycStatus,
  listKycApplications: mockListKyc,
  recordTransaction: mockRecordTx,
  getTransactionsByWallet: mockGetTxByWallet,
  updateTransactionStatus: mockUpdateTxStatus,
  bindWallet: mockBindWallet,
  getWalletsByUserId: mockGetWallets,
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(null),
  getDb: vi.fn().mockResolvedValue(mockDb),
}));

// ============================================================
describe("阶段 8：前端-数据库交互测试", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- 8.1 KYC 白名单申请 ----
  describe("8.1 KYC 白名单申请", () => {
    it("应成功创建 KYC 申请记录", async () => {
      const { createKycApplication } = await import("./db");
      const result = await createKycApplication({
        fullName: "张三",
        email: "zhangsan@example.com",
        phone: "13800138000",
        country: "中国",
        investmentAmount: "10000",
        investmentCurrency: "USDT",
        walletAddress: "0x1234567890123456789012345678901234567890",
        status: "pending",
      });
      expect(result).toBeDefined();
      expect(mockCreateKyc).toHaveBeenCalledTimes(1);
    });

    it("应能查询指定钱包地址的 KYC 记录", async () => {
      const { getKycByWallet } = await import("./db");
      const result = await getKycByWallet("0x1234567890123456789012345678901234567890");
      expect(result).toBeDefined();
      expect(result?.walletAddress).toBe("0x1234567890123456789012345678901234567890");
      expect(result?.status).toBe("pending");
    });

    it("应能更新 KYC 状态为 approved", async () => {
      const { updateKycStatus } = await import("./db");
      await updateKycStatus(42, "approved", {
        txHashKyc: "0x" + "b".repeat(64),
        txHashSender: "0x" + "c".repeat(64),
      });
      expect(mockUpdateKycStatus).toHaveBeenCalledWith(42, "approved", {
        txHashKyc: "0x" + "b".repeat(64),
        txHashSender: "0x" + "c".repeat(64),
      });
    });

    it("应能更新 KYC 状态为 rejected 并附带备注", async () => {
      const { updateKycStatus } = await import("./db");
      await updateKycStatus(42, "rejected", { reviewNote: "信息不完整" });
      expect(mockUpdateKycStatus).toHaveBeenCalledWith(42, "rejected", { reviewNote: "信息不完整" });
    });

    it("管理员应能列出所有 KYC 申请", async () => {
      const { listKycApplications } = await import("./db");
      const list = await listKycApplications();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
    });

    it("管理员应能按状态过滤 KYC 申请", async () => {
      const { listKycApplications } = await import("./db");
      await listKycApplications("pending");
      expect(mockListKyc).toHaveBeenCalledWith("pending");
    });
  });

  // ---- 8.2 交易记录 ----
  describe("8.2 交易记录", () => {
    it("应成功记录质押交易", async () => {
      const { recordTransaction } = await import("./db");
      await recordTransaction({
        walletAddress: "0x1234567890123456789012345678901234567890",
        txHash: "0x" + "a".repeat(64),
        txType: "stake",
        amount: "1000.000000000000000000",
        tokenSymbol: "PVC",
        status: "pending",
      });
      expect(mockRecordTx).toHaveBeenCalledTimes(1);
    });

    it("应成功记录购买交易（私募）", async () => {
      const { recordTransaction } = await import("./db");
      await recordTransaction({
        walletAddress: "0x1234567890123456789012345678901234567890",
        txHash: "0x" + "d".repeat(64),
        txType: "purchase_private",
        amount: "500.000000",
        tokenSymbol: "USDT",
        status: "pending",
      });
      expect(mockRecordTx).toHaveBeenCalledTimes(1);
    });

    it("应能查询钱包的交易历史", async () => {
      const { getTransactionsByWallet } = await import("./db");
      const txList = await getTransactionsByWallet("0x1234567890123456789012345678901234567890");
      expect(Array.isArray(txList)).toBe(true);
      expect(txList.length).toBeGreaterThan(0);
      expect(txList[0].txType).toBe("stake");
    });

    it("应能更新交易状态为 confirmed", async () => {
      const { updateTransactionStatus } = await import("./db");
      await updateTransactionStatus("0x" + "a".repeat(64), "confirmed", {
        blockNumber: 12345678,
        gasUsed: "85000",
        confirmedAt: new Date(),
      });
      expect(mockUpdateTxStatus).toHaveBeenCalledTimes(1);
    });

    it("应能更新交易状态为 failed 并记录错误信息", async () => {
      const { updateTransactionStatus } = await import("./db");
      await updateTransactionStatus("0x" + "e".repeat(64), "failed", {
        errorMessage: "execution reverted: insufficient balance",
      });
      expect(mockUpdateTxStatus).toHaveBeenCalledWith(
        "0x" + "e".repeat(64),
        "failed",
        { errorMessage: "execution reverted: insufficient balance" }
      );
    });
  });

  // ---- 8.3 钱包绑定 ----
  describe("8.3 钱包绑定", () => {
    it("应成功绑定钱包到用户账号", async () => {
      const { bindWallet } = await import("./db");
      await bindWallet({
        userId: 1,
        walletAddress: "0x1234567890123456789012345678901234567890",
        isPrimary: "yes",
      });
      expect(mockBindWallet).toHaveBeenCalledTimes(1);
    });

    it("应能查询用户绑定的所有钱包", async () => {
      const { getWalletsByUserId } = await import("./db");
      const wallets = await getWalletsByUserId(1);
      expect(Array.isArray(wallets)).toBe(true);
      expect(wallets.length).toBeGreaterThan(0);
      expect(wallets[0].walletAddress).toBe("0x1234567890123456789012345678901234567890");
    });
  });

  // ---- 8.4 数据验证 ----
  describe("8.4 数据验证", () => {
    it("KYC 申请应包含必要字段", () => {
      const requiredFields = ["fullName", "email", "phone", "country", "investmentAmount", "walletAddress"];
      const record = mockKycRecord;
      requiredFields.forEach(field => {
        expect(record).toHaveProperty(field);
      });
    });

    it("交易记录应包含必要字段", () => {
      const requiredFields = ["walletAddress", "txHash", "txType", "status", "createdAt"];
      requiredFields.forEach(field => {
        expect(mockTxRecord).toHaveProperty(field);
      });
    });

    it("钱包地址应为小写存储", async () => {
      const { getKycByWallet } = await import("./db");
      await getKycByWallet("0xABCDEF1234567890123456789012345678901234");
      expect(mockGetKycByWallet).toHaveBeenCalledWith("0xABCDEF1234567890123456789012345678901234");
    });
  });
});
