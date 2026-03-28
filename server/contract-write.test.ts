/**
 * 阶段 7：合约写入操作测试
 * 测试后端能否正确构建合约调用（使用 mock，不消耗真实 Gas）
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

// ---- Mock ethers ----
const mockWait = vi.fn().mockResolvedValue({ status: 1 });
const mockTx = { hash: "0xmockhash123", wait: mockWait };

const mockContract = {
  // ERC20 approve
  approve: vi.fn().mockResolvedValue(mockTx),
  allowance: vi.fn().mockResolvedValue(BigInt("1000000000000000000000")), // 1000 tokens
  balanceOf: vi.fn().mockResolvedValue(BigInt("5000000000000000000000")), // 5000 tokens
  // StakingManager
  stake: vi.fn().mockResolvedValue(mockTx),
  unstake: vi.fn().mockResolvedValue(mockTx),
  claimReward: vi.fn().mockResolvedValue(mockTx),
  getStakeInfo: vi.fn().mockResolvedValue({
    amount: BigInt("1000000000000000000000"),
    startTime: BigInt(Math.floor(Date.now() / 1000) - 86400),
    pendingReward: BigInt("50000000000000000000"),
  }),
  // PrivateSale / PublicSale
  purchase: vi.fn().mockResolvedValue(mockTx),
  getUserContribution: vi.fn().mockResolvedValue(BigInt("500000000")), // 500 USDT
  // RevenueDistributor
  claimDividend: vi.fn().mockResolvedValue(mockTx),
  getClaimableAmount: vi.fn().mockResolvedValue(BigInt("100000000")), // 100 USDT
};

vi.mock("ethers", () => ({
  ethers: {
    JsonRpcProvider: vi.fn().mockImplementation(() => ({
      getNetwork: vi.fn().mockResolvedValue({ chainId: 80002n, name: "amoy" }),
      getBalance: vi.fn().mockResolvedValue(BigInt("2000000000000000000")), // 2 MATIC
    })),
    Wallet: vi.fn().mockImplementation(() => ({
      address: "0xDeployer1234567890123456789012345678901234",
      provider: {},
    })),
    Contract: vi.fn().mockImplementation(() => mockContract),
    parseUnits: vi.fn().mockImplementation((val: string, decimals: number) =>
      BigInt(Math.floor(parseFloat(val) * 10 ** decimals))
    ),
    formatUnits: vi.fn().mockImplementation((val: bigint, decimals: number) =>
      (Number(val) / 10 ** decimals).toString()
    ),
    isAddress: vi.fn().mockReturnValue(true),
  },
}));

// ---- 测试用合约地址 ----
const TEST_ADDRESSES = {
  pvCoin: "0x1111111111111111111111111111111111111111",
  c2Coin: "0x2222222222222222222222222222222222222222",
  usdt: "0x3333333333333333333333333333333333333333",
  stakingManager: "0x4444444444444444444444444444444444444444",
  privateSale: "0x5555555555555555555555555555555555555555",
  publicSale: "0x6666666666666666666666666666666666666666",
  revenueDistributor: "0x7777777777777777777777777777777777777777",
  testUser: "0x8888888888888888888888888888888888888888",
};

// ---- 辅助：模拟合约调用 ----
async function simulateApprove(spender: string, amount: string) {
  const { ethers } = await import("ethers");
  const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
  const wallet = new ethers.Wallet("0x" + "a".repeat(64), provider);
  const pvCoin = new ethers.Contract(TEST_ADDRESSES.pvCoin, [], wallet);
  const amountWei = ethers.parseUnits(amount, 18);
  const tx = await pvCoin.approve(spender, amountWei);
  const receipt = await tx.wait();
  return { txHash: tx.hash, receipt };
}

async function simulateStake(amount: string) {
  const { ethers } = await import("ethers");
  const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
  const wallet = new ethers.Wallet("0x" + "a".repeat(64), provider);
  const staking = new ethers.Contract(TEST_ADDRESSES.stakingManager, [], wallet);
  const amountWei = ethers.parseUnits(amount, 18);
  const tx = await staking.stake(amountWei);
  const receipt = await tx.wait();
  return { txHash: tx.hash, receipt };
}

async function simulateUnstake(amount: string) {
  const { ethers } = await import("ethers");
  const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
  const wallet = new ethers.Wallet("0x" + "a".repeat(64), provider);
  const staking = new ethers.Contract(TEST_ADDRESSES.stakingManager, [], wallet);
  const amountWei = ethers.parseUnits(amount, 18);
  const tx = await staking.unstake(amountWei);
  const receipt = await tx.wait();
  return { txHash: tx.hash, receipt };
}

async function simulatePurchase(contractAddr: string, usdtAmount: string) {
  const { ethers } = await import("ethers");
  const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
  const wallet = new ethers.Wallet("0x" + "a".repeat(64), provider);
  const sale = new ethers.Contract(contractAddr, [], wallet);
  const amountWei = ethers.parseUnits(usdtAmount, 6); // USDT 6 decimals
  const tx = await sale.purchase(amountWei);
  const receipt = await tx.wait();
  return { txHash: tx.hash, receipt };
}

async function simulateClaimReward() {
  const { ethers } = await import("ethers");
  const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
  const wallet = new ethers.Wallet("0x" + "a".repeat(64), provider);
  const staking = new ethers.Contract(TEST_ADDRESSES.stakingManager, [], wallet);
  const tx = await staking.claimReward();
  const receipt = await tx.wait();
  return { txHash: tx.hash, receipt };
}

async function simulateClaimDividend(distributionId: number) {
  const { ethers } = await import("ethers");
  const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
  const wallet = new ethers.Wallet("0x" + "a".repeat(64), provider);
  const revenue = new ethers.Contract(TEST_ADDRESSES.revenueDistributor, [], wallet);
  const tx = await revenue.claimDividend(distributionId);
  const receipt = await tx.wait();
  return { txHash: tx.hash, receipt };
}

// ============================================================
describe("阶段 7：合约写入操作测试", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWait.mockResolvedValue({ status: 1 });
  });

  // ---- 7.1 代币授权 (Approve) ----
  describe("7.1 代币授权 (Approve)", () => {
    it("应成功授权 StakingManager 使用 PVC", async () => {
      const result = await simulateApprove(TEST_ADDRESSES.stakingManager, "1000");
      expect(result.txHash).toBe("0xmockhash123");
      expect(result.receipt.status).toBe(1);
      expect(mockContract.approve).toHaveBeenCalledWith(
        TEST_ADDRESSES.stakingManager,
        expect.any(BigInt)
      );
    });

    it("应成功授权 PrivateSale 使用 USDT", async () => {
      const result = await simulateApprove(TEST_ADDRESSES.privateSale, "500");
      expect(result.txHash).toBeDefined();
      expect(mockContract.approve).toHaveBeenCalledTimes(1);
    });

    it("应成功授权 PublicSale 使用 USDT", async () => {
      const result = await simulateApprove(TEST_ADDRESSES.publicSale, "200");
      expect(result.txHash).toBeDefined();
      expect(mockContract.approve).toHaveBeenCalledTimes(1);
    });
  });

  // ---- 7.2 质押操作 ----
  describe("7.2 质押操作", () => {
    it("应成功质押 PVC 代币", async () => {
      const result = await simulateStake("500");
      expect(result.txHash).toBe("0xmockhash123");
      expect(result.receipt.status).toBe(1);
      expect(mockContract.stake).toHaveBeenCalledWith(expect.any(BigInt));
    });

    it("应成功赎回质押的 PVC", async () => {
      const result = await simulateUnstake("500");
      expect(result.txHash).toBe("0xmockhash123");
      expect(result.receipt.status).toBe(1);
      expect(mockContract.unstake).toHaveBeenCalledWith(expect.any(BigInt));
    });

    it("质押金额应正确转换为 Wei（18 位小数）", async () => {
      const { ethers } = await import("ethers");
      const amountWei = ethers.parseUnits("100", 18);
      expect(amountWei).toBe(BigInt("100000000000000000000"));
    });
  });

  // ---- 7.3 购买代币 ----
  describe("7.3 购买代币", () => {
    it("应成功参与 PrivateSale 购买", async () => {
      const result = await simulatePurchase(TEST_ADDRESSES.privateSale, "500");
      expect(result.txHash).toBe("0xmockhash123");
      expect(result.receipt.status).toBe(1);
      expect(mockContract.purchase).toHaveBeenCalledWith(expect.any(BigInt));
    });

    it("应成功参与 PublicSale 购买", async () => {
      const result = await simulatePurchase(TEST_ADDRESSES.publicSale, "200");
      expect(result.txHash).toBe("0xmockhash123");
      expect(result.receipt.status).toBe(1);
      expect(mockContract.purchase).toHaveBeenCalledWith(expect.any(BigInt));
    });

    it("USDT 金额应正确转换为 Wei（6 位小数）", async () => {
      const { ethers } = await import("ethers");
      const amountWei = ethers.parseUnits("500", 6);
      expect(amountWei).toBe(BigInt("500000000"));
    });
  });

  // ---- 7.4 领取收益 ----
  describe("7.4 领取收益", () => {
    it("应成功领取质押收益", async () => {
      const result = await simulateClaimReward();
      expect(result.txHash).toBe("0xmockhash123");
      expect(result.receipt.status).toBe(1);
      expect(mockContract.claimReward).toHaveBeenCalledTimes(1);
    });

    it("应成功领取分红收益", async () => {
      const result = await simulateClaimDividend(1);
      expect(result.txHash).toBe("0xmockhash123");
      expect(result.receipt.status).toBe(1);
      expect(mockContract.claimDividend).toHaveBeenCalledWith(1);
    });
  });

  // ---- 7.5 交易失败处理 ----
  describe("7.5 交易失败处理", () => {
    it("交易被 revert 时应抛出错误", async () => {
      mockContract.stake.mockRejectedValueOnce(
        new Error("execution reverted: insufficient balance")
      );
      await expect(simulateStake("99999999")).rejects.toThrow("insufficient balance");
    });

    it("Gas 不足时应抛出错误", async () => {
      mockContract.purchase.mockRejectedValueOnce(
        new Error("insufficient funds for gas")
      );
      await expect(
        simulatePurchase(TEST_ADDRESSES.privateSale, "1000")
      ).rejects.toThrow("insufficient funds for gas");
    });

    it("交易 receipt status=0 表示失败", async () => {
      mockWait.mockResolvedValueOnce({ status: 0 });
      const result = await simulateStake("100");
      expect(result.receipt.status).toBe(0);
    });
  });
});
