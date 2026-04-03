/**
 * 月度质押奖励 & 分红定时任务测试
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { runMonthlyStakingReward, runMonthlyRevenue } from "./rewardScheduler";

// ─── Mock 依赖 ────────────────────────────────────────────────────────────────

vi.mock("./_core/env", () => ({
  ENV: {
    blockchainRpcUrl: "https://rpc-amoy.polygon.technology",
    deployerPrivateKey: "0x" + "a".repeat(64),
    stakingManagerAddress: "0x" + "1".repeat(40),
    revenueDistributorAddress: "0x" + "2".repeat(40),
    pvCoinAddress: "0x" + "3".repeat(40),
    c2CoinAddress: "0x" + "4".repeat(40),
    usdtAddress: "0x" + "5".repeat(40),
  },
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

vi.mock("./db", () => ({
  recordAdminTransaction: vi.fn().mockResolvedValue({ id: 1 }),
  updateAdminTransactionStatus: vi.fn().mockResolvedValue(undefined),
  getPvcHolderAddresses: vi.fn().mockResolvedValue([]),
  getRevenueRecordByPeriod: vi.fn(),
  listAdminTransactions: vi.fn().mockResolvedValue([]),
}));

// Mock ethers
vi.mock("ethers", () => {
  const mockWait = vi.fn().mockResolvedValue({ blockNumber: 12345 });
  const mockTx = { hash: "0xabc123", wait: mockWait };
  const mockContract = {
    startMonthlyReward: vi.fn().mockResolvedValue(mockTx),
    calculateRewardsBatch: vi.fn().mockResolvedValue(mockTx),
    getStakedAmount: vi.fn().mockResolvedValue(BigInt(100_000_000)),
    startDistribution: vi.fn().mockResolvedValue(mockTx),
    calculateRevenuesBatch: vi.fn().mockResolvedValue(mockTx),
  };
  return {
    ethers: {
      JsonRpcProvider: vi.fn().mockImplementation(() => ({
        getBlockNumber: vi.fn().mockResolvedValue(1000),
        getLogs: vi.fn().mockResolvedValue([]),
      })),
      Wallet: vi.fn().mockImplementation(() => ({ address: "0xdeployer" })),
      Contract: vi.fn().mockImplementation(() => mockContract),
      Interface: vi.fn().mockImplementation(() => ({
        getEvent: vi.fn().mockReturnValue({ topicHash: "0xtopic" }),
        parseLog: vi.fn().mockReturnValue(null),
      })),
      ZeroAddress: "0x0000000000000000000000000000000000000000",
      parseUnits: vi.fn().mockReturnValue(BigInt(1_000_000)),
    },
  };
});

// ─── 测试 ─────────────────────────────────────────────────────────────────────

describe("rewardScheduler - 质押奖励任务", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("当缺少分红记录时，应返回失败并携带错误信息", async () => {
    const { getRevenueRecordByPeriod } = await import("./db");
    vi.mocked(getRevenueRecordByPeriod).mockResolvedValue(undefined);

    const result = await runMonthlyStakingReward("manual");

    expect(result.success).toBe(false);
    expect(result.error).toContain("未找到");
  });

  it("当分红池为 0 时，应返回失败", async () => {
    const { getRevenueRecordByPeriod } = await import("./db");
    vi.mocked(getRevenueRecordByPeriod).mockResolvedValue({
      id: 1,
      periodYear: 2026,
      periodMonth: 3,
      dividendPool: "0",
      totalGeneration: "1000",
      totalRevenue: "5000",
      exchangeRate: "7.2",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await runMonthlyStakingReward("manual");

    expect(result.success).toBe(false);
    expect(result.error).toContain("质押奖励金额为 0");
  });

  it("当有有效分红记录但无质押者时，应成功并返回 0 质押者", async () => {
    const { getRevenueRecordByPeriod, getPvcHolderAddresses } = await import("./db");
    vi.mocked(getRevenueRecordByPeriod).mockResolvedValue({
      id: 1,
      periodYear: 2026,
      periodMonth: 3,
      dividendPool: "10000",
      totalGeneration: "50000",
      totalRevenue: "100000",
      exchangeRate: "7.2",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(getPvcHolderAddresses).mockResolvedValue([]);

    // Mock ethers Contract.getStakedAmount 返回 0（无质押者）
    const { ethers } = await import("ethers");
    vi.mocked(ethers.Contract).mockImplementationOnce(() => ({
      startMonthlyReward: vi.fn().mockResolvedValue({ hash: "0xstartTx", wait: vi.fn().mockResolvedValue({ blockNumber: 100 }) }),
      calculateRewardsBatch: vi.fn().mockResolvedValue({ hash: "0xbatchTx", wait: vi.fn().mockResolvedValue({ blockNumber: 101 }) }),
      getStakedAmount: vi.fn().mockResolvedValue(BigInt(0)),
    }) as never);

    const result = await runMonthlyStakingReward("manual");

    expect(result.success).toBe(true);
    expect(result.totalStakers).toBe(0);
    expect(result.batches).toBe(0);
  });

  it("手动触发和定时触发应产生相同的执行结果", async () => {
    const { getRevenueRecordByPeriod, getPvcHolderAddresses } = await import("./db");
    const mockRecord = {
      id: 1,
      periodYear: 2026,
      periodMonth: 3,
      dividendPool: "5000",
      totalGeneration: "50000",
      totalRevenue: "100000",
      exchangeRate: "7.2",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(getRevenueRecordByPeriod).mockResolvedValue(mockRecord);
    vi.mocked(getPvcHolderAddresses).mockResolvedValue([]);

    const { ethers } = await import("ethers");
    const mockContractInstance = {
      startMonthlyReward: vi.fn().mockResolvedValue({ hash: "0xtx1", wait: vi.fn().mockResolvedValue({ blockNumber: 100 }) }),
      calculateRewardsBatch: vi.fn().mockResolvedValue({ hash: "0xtx2", wait: vi.fn().mockResolvedValue({ blockNumber: 101 }) }),
      getStakedAmount: vi.fn().mockResolvedValue(BigInt(0)),
    };
    vi.mocked(ethers.Contract).mockImplementation(() => mockContractInstance as never);

    const manualResult = await runMonthlyStakingReward("manual");
    const schedulerResult = await runMonthlyStakingReward("scheduler");

    expect(manualResult.success).toBe(schedulerResult.success);
  });
});

describe("rewardScheduler - 分红任务", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("当缺少分红记录时，应返回失败并携带错误信息", async () => {
    const { getRevenueRecordByPeriod } = await import("./db");
    vi.mocked(getRevenueRecordByPeriod).mockResolvedValue(undefined);

    const result = await runMonthlyRevenue("manual");

    expect(result.success).toBe(false);
    expect(result.error).toContain("未找到");
  });

  it("当分红池为 0 时，应返回失败", async () => {
    const { getRevenueRecordByPeriod } = await import("./db");
    vi.mocked(getRevenueRecordByPeriod).mockResolvedValue({
      id: 1,
      periodYear: 2026,
      periodMonth: 3,
      dividendPool: "0",
      totalGeneration: "1000",
      totalRevenue: "5000",
      exchangeRate: "7.2",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await runMonthlyRevenue("manual");

    expect(result.success).toBe(false);
    expect(result.error).toContain("分红金额为 0");
  });

  it("当有有效分红记录但无 PVC 持有者时，应成功并返回 0 持有者", async () => {
    const { getRevenueRecordByPeriod, getPvcHolderAddresses } = await import("./db");
    vi.mocked(getRevenueRecordByPeriod).mockResolvedValue({
      id: 1,
      periodYear: 2026,
      periodMonth: 3,
      dividendPool: "20000",
      totalGeneration: "50000",
      totalRevenue: "100000",
      exchangeRate: "7.2",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(getPvcHolderAddresses).mockResolvedValue([]);

    const { ethers } = await import("ethers");
    vi.mocked(ethers.Contract).mockImplementationOnce(() => ({
      startDistribution: vi.fn().mockResolvedValue({ hash: "0xstartTx", wait: vi.fn().mockResolvedValue({ blockNumber: 100 }) }),
      calculateRevenuesBatch: vi.fn().mockResolvedValue({ hash: "0xbatchTx", wait: vi.fn().mockResolvedValue({ blockNumber: 101 }) }),
    }) as never);

    const result = await runMonthlyRevenue("manual");

    expect(result.success).toBe(true);
    expect(result.totalHolders).toBe(0);
    expect(result.batches).toBe(0);
  });

  it("应正确去重 DB 和链上的持有者地址", async () => {
    const { getRevenueRecordByPeriod, getPvcHolderAddresses } = await import("./db");
    vi.mocked(getRevenueRecordByPeriod).mockResolvedValue({
      id: 1,
      periodYear: 2026,
      periodMonth: 3,
      dividendPool: "10000",
      totalGeneration: "50000",
      totalRevenue: "100000",
      exchangeRate: "7.2",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    // DB 和链上有重复地址
    const addr1 = "0x" + "a".repeat(40);
    const addr2 = "0x" + "b".repeat(40);
    vi.mocked(getPvcHolderAddresses).mockResolvedValue([addr1, addr2, addr1]); // 含重复

    const { ethers } = await import("ethers");
    const mockContractInstance = {
      startDistribution: vi.fn().mockResolvedValue({ hash: "0xstartTx", wait: vi.fn().mockResolvedValue({ blockNumber: 100 }) }),
      calculateRevenuesBatch: vi.fn().mockResolvedValue({ hash: "0xbatchTx", wait: vi.fn().mockResolvedValue({ blockNumber: 101 }) }),
    };
    vi.mocked(ethers.Contract).mockImplementation(() => mockContractInstance as never);

    const result = await runMonthlyRevenue("manual");

    expect(result.success).toBe(true);
    // 去重后应为 2 个持有者
    expect(result.totalHolders).toBe(2);
    expect(result.batches).toBe(1);
    // calculateRevenuesBatch 应被调用一次（2 个地址，1 批）
    expect(mockContractInstance.calculateRevenuesBatch).toHaveBeenCalledTimes(1);
    expect(mockContractInstance.calculateRevenuesBatch).toHaveBeenCalledWith([
      addr1.toLowerCase(),
      addr2.toLowerCase(),
    ]);
  });
});

describe("adminReward 路由 - 权限控制", () => {
  it("非管理员触发质押奖励应被拒绝", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({
      user: { id: 1, role: "user", walletAddress: "0xuser", openId: "u1", name: "User", createdAt: new Date(), updatedAt: new Date() },
      req: {} as never,
      res: {} as never,
    });
    await expect(caller.adminReward.triggerStakingReward()).rejects.toThrow("仅管理员可操作");
  });

  it("非管理员触发分红应被拒绝", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({
      user: { id: 1, role: "user", walletAddress: "0xuser", openId: "u1", name: "User", createdAt: new Date(), updatedAt: new Date() },
      req: {} as never,
      res: {} as never,
    });
    await expect(caller.adminReward.triggerRevenue()).rejects.toThrow("仅管理员可操作");
  });

  it("非管理员查询奖励历史应被拒绝", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({
      user: { id: 1, role: "user", walletAddress: "0xuser", openId: "u1", name: "User", createdAt: new Date(), updatedAt: new Date() },
      req: {} as never,
      res: {} as never,
    });
    await expect(caller.adminReward.getRewardHistory()).rejects.toThrow("仅管理员可查看");
  });

  it("管理员查询奖励历史应只返回质押奖励和分红类型记录", async () => {
    const { listAdminTransactions } = await import("./db");
    vi.mocked(listAdminTransactions).mockResolvedValue([
      { id: 1, txType: "distribute_staking_reward", txHash: "0x1", amount: "1000", status: "confirmed", note: "质押奖励", createdBy: "system", blockNumber: 100, createdAt: new Date(), updatedAt: new Date() },
      { id: 2, txType: "distribute_revenue", txHash: "0x2", amount: "5000", status: "confirmed", note: "分红", createdBy: "system", blockNumber: 101, createdAt: new Date(), updatedAt: new Date() },
      { id: 3, txType: "airdrop_calculate", txHash: "0x3", amount: "100", status: "confirmed", note: "空投", createdBy: "system", blockNumber: 102, createdAt: new Date(), updatedAt: new Date() },
    ] as never);

    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({
      user: { id: 1, role: "admin", walletAddress: "0xadmin", openId: "a1", name: "Admin", createdAt: new Date(), updatedAt: new Date() },
      req: {} as never,
      res: {} as never,
    });
    const history = await caller.adminReward.getRewardHistory();

    expect(history).toHaveLength(2);
    expect(history.every((tx) => ["distribute_staking_reward", "distribute_revenue"].includes(tx.txType))).toBe(true);
  });
});
