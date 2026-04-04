import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

// ─────────────────────────────────────────────────────────────────────────────
// 1. 合约地址与 RPC 配置验证
// ─────────────────────────────────────────────────────────────────────────────
describe("Purchase contract config", () => {
  it("PRIVATE_SALE_ADDRESS 是有效的以太坊地址", () => {
    const addr = process.env.PRIVATE_SALE_ADDRESS;
    if (!addr || addr === "0x0000000000000000000000000000000000000000") {
      console.warn("PRIVATE_SALE_ADDRESS 未配置，跳过验证");
      return;
    }
    expect(ethers.isAddress(addr)).toBe(true);
  });

  it("PUBLIC_SALE_ADDRESS 是有效的以太坊地址", () => {
    const addr = process.env.PUBLIC_SALE_ADDRESS;
    if (!addr || addr === "0x0000000000000000000000000000000000000000") {
      console.warn("PUBLIC_SALE_ADDRESS 未配置，跳过验证");
      return;
    }
    expect(ethers.isAddress(addr)).toBe(true);
  });

  it("USDT_ADDRESS 是有效的以太坊地址", () => {
    const addr = process.env.USDT_ADDRESS;
    if (!addr || addr === "0x0000000000000000000000000000000000000000") {
      console.warn("USDT_ADDRESS 未配置，跳过验证");
      return;
    }
    expect(ethers.isAddress(addr)).toBe(true);
  });

  it("BLOCKCHAIN_RPC_URL 已配置", () => {
    const rpc = process.env.BLOCKCHAIN_RPC_URL;
    if (!rpc) {
      console.warn("BLOCKCHAIN_RPC_URL 未配置，将使用默认 Amoy RPC");
      return;
    }
    expect(rpc).toMatch(/^https?:\/\//);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. exchangeRate 精度换算逻辑单元测试
// ─────────────────────────────────────────────────────────────────────────────
describe("exchangeRate 精度换算逻辑", () => {
  /**
   * 合约链上 exchangeRate 带 6 位精度：
   *   exchangeRate / 10^6 = PVC per USDT
   *   tokenPrice = 1 / (exchangeRate / 10^6) = 10^6 / exchangeRate
   *
   * 例：exchangeRate = 10_000_000 → pvcPerUsdt = 10 → tokenPrice = 0.1000
   */
  function calcTokenPrice(rawExchangeRate: number): string {
    const pvcPerUsdt = rawExchangeRate / 1e6;
    return pvcPerUsdt > 0 ? (1 / pvcPerUsdt).toFixed(4) : "0";
  }

  it("exchangeRate=10_000_000 → tokenPrice=0.1000（私募 10 PVC/USDT）", () => {
    expect(calcTokenPrice(10_000_000)).toBe("0.1000");
  });

  it("exchangeRate=5_000_000 → tokenPrice=0.2000（公募 5 PVC/USDT）", () => {
    expect(calcTokenPrice(5_000_000)).toBe("0.2000");
  });

  it("exchangeRate=1_000_000 → tokenPrice=1.0000（1 PVC/USDT）", () => {
    expect(calcTokenPrice(1_000_000)).toBe("1.0000");
  });

  it("exchangeRate=0 → tokenPrice=0（防止除零）", () => {
    expect(calcTokenPrice(0)).toBe("0");
  });

  it("exchangeRate=100_000_000 → tokenPrice=0.0100（100 PVC/USDT）", () => {
    expect(calcTokenPrice(100_000_000)).toBe("0.0100");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. getPublicSaleInfo 降级逻辑（合约未配置）
// ─────────────────────────────────────────────────────────────────────────────
describe("getPublicSaleInfo - 合约未配置时的降级逻辑", () => {
  const originalPublicSale = process.env.PUBLIC_SALE_ADDRESS;

  beforeEach(() => {
    // 临时清空公募合约地址，模拟未配置状态
    process.env.PUBLIC_SALE_ADDRESS = "";
  });

  afterEach(() => {
    // 恢复原始地址
    process.env.PUBLIC_SALE_ADDRESS = originalPublicSale;
  });

  it("PUBLIC_SALE_ADDRESS 为空时应返回 contractConfigured: false", async () => {
    const { purchaseRouter } = await import("./routers/purchase");
    const caller = purchaseRouter.createCaller({} as never);
    const result = await caller.getPublicSaleInfo({ walletAddress: undefined });

    expect(result.contractConfigured).toBe(false);
    expect(result.isActive).toBe(false);
    expect(result.tokenPrice).toBe("0.20");
    expect(result.exchangeRate).toBe(5);
    expect(result.userUsdtBalance).toBe("0");
    expect(result.userAllowance).toBe("0");
    expect(result.userPurchased).toBe("0");
  });

  it("PUBLIC_SALE_ADDRESS 为零地址时应返回 contractConfigured: false", async () => {
    process.env.PUBLIC_SALE_ADDRESS = "0x0000000000000000000000000000000000000000";
    const { purchaseRouter } = await import("./routers/purchase");
    const caller = purchaseRouter.createCaller({} as never);
    const result = await caller.getPublicSaleInfo({ walletAddress: undefined });

    expect(result.contractConfigured).toBe(false);
    expect(result.isActive).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. getPrivateSaleInfo 降级逻辑（合约未配置）
// ─────────────────────────────────────────────────────────────────────────────
describe("getPrivateSaleInfo - 合约未配置时的降级逻辑", () => {
  const originalPrivateSale = process.env.PRIVATE_SALE_ADDRESS;

  beforeEach(() => {
    process.env.PRIVATE_SALE_ADDRESS = "";
  });

  afterEach(() => {
    process.env.PRIVATE_SALE_ADDRESS = originalPrivateSale;
  });

  it("PRIVATE_SALE_ADDRESS 为空时应返回 contractConfigured: false", async () => {
    const { purchaseRouter } = await import("./routers/purchase");
    const caller = purchaseRouter.createCaller({} as never);
    const result = await caller.getPrivateSaleInfo({ walletAddress: undefined });

    expect(result.contractConfigured).toBe(false);
    expect(result.isActive).toBe(false);
    expect(result.tokenPrice).toBe("0.10");
    expect(result.exchangeRate).toBe(10);
    expect(result.maxPurchase).toBe("100000");
    expect(result.userUsdtBalance).toBe("0");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. getPublicSaleInfo - 合约调用失败时的降级逻辑（无效 RPC）
// ─────────────────────────────────────────────────────────────────────────────
describe("getPublicSaleInfo - 合约调用失败时的降级逻辑", () => {
  const originalPublicSale = process.env.PUBLIC_SALE_ADDRESS;
  const originalRpc = process.env.BLOCKCHAIN_RPC_URL;

  beforeEach(() => {
    // 设置一个有效地址但指向无效 RPC，触发合约调用失败
    process.env.PUBLIC_SALE_ADDRESS = "0x44F8E4C74caC9196DF8038041A64716081Ba04e1";
    process.env.BLOCKCHAIN_RPC_URL = "https://invalid-rpc-endpoint-that-does-not-exist.example.com";
  });

  afterEach(() => {
    process.env.PUBLIC_SALE_ADDRESS = originalPublicSale;
    process.env.BLOCKCHAIN_RPC_URL = originalRpc;
  });

  it("RPC 不可达时应返回降级数据（error 字段 + contractConfigured: true）", async () => {
    const { purchaseRouter } = await import("./routers/purchase");
    const caller = purchaseRouter.createCaller({} as never);
    const result = await caller.getPublicSaleInfo({ walletAddress: undefined });

    // 降级时 contractConfigured 为 true（地址已配置，只是调用失败）
    expect(result.contractConfigured).toBe(true);
    expect(result.isActive).toBe(false);
    // 降级时应包含 error 字段提示用户
    expect((result as { error?: string }).error).toBeDefined();
    expect((result as { error?: string }).error).toContain("失败");
    // 降级时应返回安全的默认值
    expect(result.userUsdtBalance).toBe("0");
    expect(result.userAllowance).toBe("0");
    expect(result.userPurchased).toBe("0");
  }, 15000); // 允许 15 秒超时（等待 RPC 连接失败）
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. recordPurchase 输入校验（Zod schema 验证）
// ─────────────────────────────────────────────────────────────────────────────
describe("recordPurchase - 输入格式校验", () => {
  // 合法的 txHash：0x + 恰好 64 位十六进制字符（共 66 字符）
  const VALID_TX_HASH = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
  const VALID_WALLET = "0x1234567890123456789012345678901234567890";

  it("有效的私募购买参数应通过 Zod 校验（数据库操作可能失败，但不应抛出 Zod 错误）", async () => {
    const { purchaseRouter } = await import("./routers/purchase");
    const caller = purchaseRouter.createCaller({} as never);

    const validInput = {
      walletAddress: VALID_WALLET,
      txHash: VALID_TX_HASH,
      usdtAmount: "1000.00",
      pvcAmount: "10000.00",
      saleType: "private" as const,
    };

    // 即使数据库操作失败，也应返回 success: false 而非抛出 Zod 错误
    const result = await caller.recordPurchase(validInput);
    expect(typeof result.success).toBe("boolean");
  });

  it("有效的公募购买参数应通过 Zod 校验", async () => {
    const { purchaseRouter } = await import("./routers/purchase");
    const caller = purchaseRouter.createCaller({} as never);

    const validInput = {
      walletAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
      txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      usdtAmount: "500.00",
      pvcAmount: "2500.00",
      saleType: "public" as const,
    };

    const result = await caller.recordPurchase(validInput);
    expect(typeof result.success).toBe("boolean");
  });

  it("无效的 walletAddress 格式应被 Zod 拒绝（非 0x 前缀）", async () => {
    const { purchaseRouter } = await import("./routers/purchase");
    const caller = purchaseRouter.createCaller({} as never);

    await expect(
      caller.recordPurchase({
        walletAddress: "invalid-address",
        txHash: VALID_TX_HASH,
        usdtAmount: "1000.00",
        pvcAmount: "10000.00",
        saleType: "private",
      })
    ).rejects.toThrow();
  });

  it("无效的 txHash 格式应被 Zod 拒绝（非 64 位十六进制）", async () => {
    const { purchaseRouter } = await import("./routers/purchase");
    const caller = purchaseRouter.createCaller({} as never);

    await expect(
      caller.recordPurchase({
        walletAddress: VALID_WALLET,
        txHash: "not-a-tx-hash",
        usdtAmount: "1000.00",
        pvcAmount: "10000.00",
        saleType: "private",
      })
    ).rejects.toThrow();
  });

  it("txHash 长度不足 64 位应被 Zod 拒绝", async () => {
    const { purchaseRouter } = await import("./routers/purchase");
    const caller = purchaseRouter.createCaller({} as never);

    await expect(
      caller.recordPurchase({
        walletAddress: VALID_WALLET,
        txHash: "0x1234abcd", // 太短
        usdtAmount: "1000.00",
        pvcAmount: "10000.00",
        saleType: "private",
      })
    ).rejects.toThrow();
  });

  it("无效的 saleType 应被 Zod 拒绝", async () => {
    const { purchaseRouter } = await import("./routers/purchase");
    const caller = purchaseRouter.createCaller({} as never);

    await expect(
      caller.recordPurchase({
        walletAddress: VALID_WALLET,
        txHash: VALID_TX_HASH,
        usdtAmount: "1000.00",
        pvcAmount: "10000.00",
        saleType: "invalid" as "private",
      })
    ).rejects.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. getPurchaseHistory 输入校验
// ─────────────────────────────────────────────────────────────────────────────
describe("getPurchaseHistory - 输入格式校验", () => {
  it("无效的 walletAddress 格式应被 Zod 拒绝", async () => {
    const { purchaseRouter } = await import("./routers/purchase");
    const caller = purchaseRouter.createCaller({} as never);

    await expect(
      caller.getPurchaseHistory({ walletAddress: "not-an-address" })
    ).rejects.toThrow();
  });

  it("有效的 walletAddress 应通过 Zod 校验（返回数组）", async () => {
    const { purchaseRouter } = await import("./routers/purchase");
    const caller = purchaseRouter.createCaller({} as never);

    const result = await caller.getPurchaseHistory({
      walletAddress: "0x1234567890123456789012345678901234567890",
    });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. 以太坊地址格式验证辅助函数测试
// ─────────────────────────────────────────────────────────────────────────────
describe("以太坊地址格式验证（ethers.isAddress）", () => {
  // ethers v6 的 isAddress 要求：全小写、全大写、或符合 EIP-55 checksum 的混合大小写
  // 不符合 EIP-55 checksum 的混合大小写地址会返回 false
  const validAddresses = [
    "0x44F8E4C74caC9196DF8038041A64716081Ba04e1",  // PublicSale v2（EIP-55 checksum）
    "0xf889dfa134E8fa22562fC40119e1B3CD2376aD94",  // tUSDT（EIP-55 checksum）
    "0x1234567890123456789012345678901234567890",  // 全小写（有效）
    "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",  // 全大写（有效）
  ];

  const invalidAddresses = [
    "0x1234",                                        // 太短（不足 40 位）
    "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG",      // 非十六进制字符
    "",                                              // 空字符串
    "not-an-address",                               // 完全无效
  ];

  validAddresses.forEach((addr) => {
    it(`有效地址 ${addr.slice(0, 10)}... 应通过验证`, () => {
      expect(ethers.isAddress(addr)).toBe(true);
    });
  });

  invalidAddresses.forEach((addr, idx) => {
    it(`无效地址 #${idx + 1} "${addr.slice(0, 15) || "(empty)"}" 应验证失败`, () => {
      expect(ethers.isAddress(addr)).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. 白名单校验场景：KYC 状态对购买流程的影响
// ─────────────────────────────────────────────────────────────────────────────
describe("白名单校验场景 - 前端购买按钮逻辑", () => {
  /**
   * 公募合约的白名单校验发生在链上（purchase 函数内部）。
   * 后端 getPublicSaleInfo 不直接校验白名单，而是返回用户余额和授权额度。
   * 前端根据 KYC 状态决定是否允许用户点击购买按钮。
   */

  it("未通过 KYC 时前端应阻止购买（无论余额是否充足）", () => {
    const userUsdtBalance = "1000.00";
    const usdtAmount = "100";
    const isKycApproved = false;

    const canPurchase =
      isKycApproved &&
      parseFloat(userUsdtBalance) >= parseFloat(usdtAmount);

    expect(canPurchase).toBe(false);
  });

  it("通过 KYC 且余额充足时前端应允许购买", () => {
    const userUsdtBalance = "1000.00";
    const usdtAmount = "100";
    const isKycApproved = true;

    const canPurchase =
      isKycApproved &&
      parseFloat(userUsdtBalance) >= parseFloat(usdtAmount);

    expect(canPurchase).toBe(true);
  });

  it("通过 KYC 但余额不足时前端应阻止购买", () => {
    const userUsdtBalance = "50.00";
    const usdtAmount = "100";
    const isKycApproved = true;

    const canPurchase =
      isKycApproved &&
      parseFloat(userUsdtBalance) >= parseFloat(usdtAmount);

    expect(canPurchase).toBe(false);
  });

  it("通过 KYC 但余额为 0 时前端应阻止购买", () => {
    const userUsdtBalance = "0";
    const usdtAmount = "100";
    const isKycApproved = true;

    const canPurchase =
      isKycApproved &&
      parseFloat(userUsdtBalance) >= parseFloat(usdtAmount);

    expect(canPurchase).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. 合约 ABI 函数签名验证
// ─────────────────────────────────────────────────────────────────────────────
describe("合约 ABI 函数签名验证", () => {
  it("SaleABI 中所有函数签名可被 ethers.Interface 正确解析", () => {
    const SaleABI = [
      "function exchangeRate() external view returns (uint256)",
      "function totalSold() external view returns (uint256)",
      "function maxPerUser() external view returns (uint256)",
      "function saleStartTime() external view returns (uint256)",
      "function saleEndTime() external view returns (uint256)",
      "function paused() external view returns (bool)",
      "function purchaseAmount(address) external view returns (uint256)",
      "function purchase(uint256 _usdtAmount) external",
    ];
    const iface = new ethers.Interface(SaleABI);

    expect(iface.getFunction("exchangeRate")).toBeTruthy();
    expect(iface.getFunction("totalSold")).toBeTruthy();
    expect(iface.getFunction("maxPerUser")).toBeTruthy();
    expect(iface.getFunction("saleStartTime")).toBeTruthy();
    expect(iface.getFunction("saleEndTime")).toBeTruthy();
    expect(iface.getFunction("paused")).toBeTruthy();
    expect(iface.getFunction("purchaseAmount")).toBeTruthy();
    expect(iface.getFunction("purchase")).toBeTruthy();
  });

  it("SaleWhitelistABI 中白名单函数签名可被 ethers.Interface 正确解析", () => {
    const SaleWhitelistABI = [
      "function addToWhitelist(address[] calldata _users) external",
      "function removeFromWhitelist(address[] calldata _users) external",
      "function isWhitelisted(address _user) external view returns (bool)",
    ];
    const iface = new ethers.Interface(SaleWhitelistABI);

    expect(iface.getFunction("isWhitelisted")).toBeTruthy();
    expect(iface.getFunction("addToWhitelist")).toBeTruthy();
    expect(iface.getFunction("removeFromWhitelist")).toBeTruthy();
  });

  it("ERC20ABI 中 allowance/balanceOf/decimals 函数签名可被 ethers.Interface 正确解析", () => {
    const ERC20ABI = [
      "function allowance(address owner, address spender) external view returns (uint256)",
      "function balanceOf(address account) external view returns (uint256)",
      "function decimals() external view returns (uint8)",
    ];
    const iface = new ethers.Interface(ERC20ABI);

    expect(iface.getFunction("allowance")).toBeTruthy();
    expect(iface.getFunction("balanceOf")).toBeTruthy();
    expect(iface.getFunction("decimals")).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. confirmTransaction 输入校验
// ─────────────────────────────────────────────────────────────────────────────
describe("confirmTransaction - 输入格式校验", () => {
  // 合法的 txHash：0x + 恰好 64 位十六进制字符（共 66 字符）
  const VALID_TX_HASH = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

  it("无效的 txHash 格式应被 Zod 拒绝", async () => {
    const { purchaseRouter } = await import("./routers/purchase");
    const caller = purchaseRouter.createCaller({} as never);

    await expect(
      caller.confirmTransaction({ txHash: "invalid-hash" })
    ).rejects.toThrow();
  });

  it("有效的 txHash 格式应通过 Zod 校验（返回合法的 status 字段）", async () => {
    const { purchaseRouter } = await import("./routers/purchase");
    const caller = purchaseRouter.createCaller({} as never);

    // 有效格式，但链上可能查不到，应返回 pending 状态
    const result = await caller.confirmTransaction({ txHash: VALID_TX_HASH });
    expect(["pending", "confirmed", "failed"]).toContain(result.status);
  }, 15000);
});
