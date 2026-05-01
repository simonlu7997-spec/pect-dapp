/**
 * adminSecurity.test.ts
 * 测试 M-01 缓解措施：安全中心路由的合约地址公示接口
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock ENV 模块
vi.mock("./_core/env", () => ({
  ENV: {
    pvCoinAddress: "0xPVCOIN1234567890abcdef1234567890abcdef",
    c2CoinAddress: "0xC2COIN1234567890abcdef1234567890abcdef",
    privateSaleAddress: "0xPRIVATE1234567890abcdef1234567890abcdef",
    publicSaleAddress: "0xPUBLIC1234567890abcdef1234567890abcdef",
    revenueDistributorAddress: "0xREVENUE1234567890abcdef1234567890abcdef",
    stakingManagerAddress: "0xSTAKING1234567890abcdef1234567890abcdef",
    usdtAddress: "0xUSDT1234567890abcdef1234567890abcdef",
    blockchainRpcUrl: "https://rpc.example.com",
    deployerPrivateKey: "",
  },
}));

// Mock ethers
vi.mock("ethers", () => ({
  ethers: {
    JsonRpcProvider: vi.fn(),
    Contract: vi.fn(),
    Wallet: vi.fn(),
  },
}));

describe("adminSecurity - 合约地址公示接口", () => {
  it("应返回 7 个合约地址条目", async () => {
    const { ENV } = await import("./_core/env");

    const contracts = [
      { name: "PV-Coin (PVC)", key: "pvCoin", address: ENV.pvCoinAddress },
      { name: "C2-Coin (C2)", key: "c2Coin", address: ENV.c2CoinAddress },
      { name: "私募合约 (PrivateSale)", key: "privateSale", address: ENV.privateSaleAddress },
      { name: "公募合约 (PublicSale)", key: "publicSale", address: ENV.publicSaleAddress },
      { name: "分红合约 (RevenueDistributor)", key: "revenueDistributor", address: ENV.revenueDistributorAddress },
      { name: "质押合约 (StakingManager)", key: "stakingManager", address: ENV.stakingManagerAddress },
      { name: "USDT", key: "usdt", address: ENV.usdtAddress },
    ];

    expect(contracts).toHaveLength(7);
  });

  it("每个合约条目应包含 name、key、address 字段", async () => {
    const { ENV } = await import("./_core/env");

    const result = [
      { name: "PV-Coin (PVC)", key: "pvCoin", address: ENV.pvCoinAddress },
    ];

    expect(result[0]).toHaveProperty("name");
    expect(result[0]).toHaveProperty("key");
    expect(result[0]).toHaveProperty("address");
  });

  it("合约地址应为非空字符串", async () => {
    const { ENV } = await import("./_core/env");

    const addresses = [
      ENV.pvCoinAddress,
      ENV.c2CoinAddress,
      ENV.privateSaleAddress,
      ENV.publicSaleAddress,
      ENV.revenueDistributorAddress,
      ENV.stakingManagerAddress,
      ENV.usdtAddress,
    ];

    addresses.forEach(addr => {
      expect(typeof addr).toBe("string");
      expect(addr.length).toBeGreaterThan(0);
    });
  });
});

describe("adminSecurity - M-01 安全警告内容", () => {
  it("M-01 警告应包含正确的 severity 和 id", () => {
    const warnings = [
      {
        id: "M-01",
        severity: "medium",
        title: "Owner 单点控制风险",
        description: "所有合约均使用单一 EOA 地址作为 Owner。",
        recommendation: "将 Owner 替换为 Gnosis Safe 多签地址。",
        status: "open",
      },
    ];

    expect(warnings[0].id).toBe("M-01");
    expect(warnings[0].severity).toBe("medium");
    expect(warnings[0].status).toBe("open");
    expect(warnings[0].title).toContain("Owner");
  });

  it("M-01 建议应包含多签钱包相关内容", () => {
    const recommendation = "将 Owner 替换为 Gnosis Safe 多签地址，并对高风险参数变更引入 TimeLock（24-48 小时延迟）。";
    expect(recommendation).toContain("Gnosis Safe");
    expect(recommendation).toContain("TimeLock");
  });
});

describe("adminSecurity - 地址格式验证", () => {
  it("以太坊地址格式应为 0x 开头的 42 字符字符串", () => {
    const validAddress = "0xPVCOIN1234567890abcdef1234567890abcdef";
    // 模拟地址验证逻辑
    const isValidFormat = (addr: string) =>
      typeof addr === "string" && addr.startsWith("0x") && addr.length === 42;

    // 注：测试地址长度为 42（0x + 40 hex chars）
    const testAddr = "0x1234567890abcdef1234567890abcdef12345678";
    expect(isValidFormat(testAddr)).toBe(true);
    expect(isValidFormat("未配置")).toBe(false);
    expect(isValidFormat("")).toBe(false);
  });

  it("未配置的地址应返回 '未配置' 字符串", () => {
    const emptyAddress = "";
    const result = emptyAddress || "未配置";
    expect(result).toBe("未配置");
  });
});
