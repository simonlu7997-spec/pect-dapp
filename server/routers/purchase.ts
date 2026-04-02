import { router, publicProcedure } from "../_core/trpc";
import { notifyOwner } from "../_core/notification";
import { z } from "zod";
import { ethers } from "ethers";
import { recordTransaction, getTransactionsByWallet } from "../db";

// PrivateSale / PublicSale 合约 ABI（接口相同）
const SaleABI = [
  "function tokenPrice() external view returns (uint256)",
  "function totalRaised() external view returns (uint256)",
  "function hardCap() external view returns (uint256)",
  "function minPurchase() external view returns (uint256)",
  "function maxPurchase() external view returns (uint256)",
  "function isActive() external view returns (bool)",
  "function purchasedAmount(address) external view returns (uint256)",
  "function buy(uint256 usdtAmount) external",
];

// ERC20 USDT ABI（授权和余额查询）
const ERC20ABI = [
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
];

function getContracts() {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || "https://rpc-amoy.polygon.technology";
  const privateSaleAddress = process.env.PRIVATE_SALE_ADDRESS;
  const publicSaleAddress = process.env.PUBLIC_SALE_ADDRESS;
  const usdtAddress = process.env.USDT_ADDRESS;
  return { rpcUrl, privateSaleAddress, publicSaleAddress, usdtAddress };
}

/** 通用：从链上读取某个 Sale 合约的完整信息 */
async function fetchSaleInfo(
  rpcUrl: string,
  saleAddress: string,
  usdtAddress: string | undefined,
  walletAddress: string | undefined,
  defaults: { tokenPrice: string; hardCap: string; minPurchase: string; maxPurchase: string }
) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const sale = new ethers.Contract(saleAddress, SaleABI, provider);

  const [tokenPrice, totalRaised, hardCap, minPurchase, maxPurchase, isActive] =
    await Promise.all([
      sale.tokenPrice(),
      sale.totalRaised(),
      sale.hardCap(),
      sale.minPurchase(),
      sale.maxPurchase(),
      sale.isActive(),
    ]);

  let usdtDecimals = 6;
  let userUsdtBalance = "0";
  let userAllowance = "0";
  let userPurchased = "0";

  if (usdtAddress && walletAddress) {
    const usdt = new ethers.Contract(usdtAddress, ERC20ABI, provider);
    const [decimals, balance, allowance, purchased] = await Promise.all([
      usdt.decimals(),
      usdt.balanceOf(walletAddress),
      usdt.allowance(walletAddress, saleAddress),
      sale.purchasedAmount(walletAddress),
    ]);
    usdtDecimals = Number(decimals);
    userUsdtBalance = ethers.formatUnits(balance, usdtDecimals);
    userAllowance = ethers.formatUnits(allowance, usdtDecimals);
    userPurchased = ethers.formatUnits(purchased, usdtDecimals);
  }

  const hardCapFormatted = ethers.formatUnits(hardCap, usdtDecimals);
  const totalRaisedFormatted = ethers.formatUnits(totalRaised, usdtDecimals);
  const progressPercent =
    Number(hardCap) > 0
      ? Math.min(100, Math.round((Number(totalRaised) / Number(hardCap)) * 100))
      : 0;

  return {
    contractConfigured: true,
    isActive,
    tokenPrice: ethers.formatUnits(tokenPrice, usdtDecimals),
    totalRaised: totalRaisedFormatted,
    hardCap: hardCapFormatted,
    minPurchase: ethers.formatUnits(minPurchase, usdtDecimals),
    maxPurchase: ethers.formatUnits(maxPurchase, usdtDecimals),
    progressPercent,
    userPurchased,
    userUsdtBalance,
    userAllowance,
  };
}

export const purchaseRouter = router({
  // ── 查询私募轮信息（链上实时数据）──────────────────────────────────
  getPrivateSaleInfo: publicProcedure
    .input(z.object({ walletAddress: z.string().optional() }))
    .query(async ({ input }) => {
      const { rpcUrl, privateSaleAddress, usdtAddress } = getContracts();

      if (!privateSaleAddress || privateSaleAddress === "0x0000000000000000000000000000000000000000") {
        return {
          contractConfigured: false,
          isActive: false,
          tokenPrice: "0.10",
          totalRaised: "0",
          hardCap: "80000",
          minPurchase: "500",
          maxPurchase: "10000",
          progressPercent: 0,
          userPurchased: "0",
          userUsdtBalance: "0",
          userAllowance: "0",
        };
      }

      try {
        return await fetchSaleInfo(rpcUrl, privateSaleAddress, usdtAddress, input.walletAddress, {
          tokenPrice: "0.10",
          hardCap: "80000",
          minPurchase: "500",
          maxPurchase: "10000",
        });
      } catch (error) {
        console.error("[Purchase] 查询私募轮信息失败:", error);
        return {
          contractConfigured: true,
          isActive: false,
          tokenPrice: "0.10",
          totalRaised: "0",
          hardCap: "80000",
          minPurchase: "500",
          maxPurchase: "10000",
          progressPercent: 0,
          userPurchased: "0",
          userUsdtBalance: "0",
          userAllowance: "0",
          error: "查询链上数据失败，请稍后重试",
        };
      }
    }),

  // ── 查询公募轮信息（链上实时数据）──────────────────────────────────
  getPublicSaleInfo: publicProcedure
    .input(z.object({ walletAddress: z.string().optional() }))
    .query(async ({ input }) => {
      const { rpcUrl, publicSaleAddress, usdtAddress } = getContracts();

      if (!publicSaleAddress || publicSaleAddress === "0x0000000000000000000000000000000000000000") {
        return {
          contractConfigured: false,
          isActive: false,
          tokenPrice: "0.20",       // 公募价格高于私募
          totalRaised: "0",
          hardCap: "200000",
          minPurchase: "100",
          maxPurchase: "50000",
          progressPercent: 0,
          userPurchased: "0",
          userUsdtBalance: "0",
          userAllowance: "0",
        };
      }

      try {
        return await fetchSaleInfo(rpcUrl, publicSaleAddress, usdtAddress, input.walletAddress, {
          tokenPrice: "0.20",
          hardCap: "200000",
          minPurchase: "100",
          maxPurchase: "50000",
        });
      } catch (error) {
        console.error("[Purchase] 查询公募轮信息失败:", error);
        return {
          contractConfigured: true,
          isActive: false,
          tokenPrice: "0.20",
          totalRaised: "0",
          hardCap: "200000",
          minPurchase: "100",
          maxPurchase: "50000",
          progressPercent: 0,
          userPurchased: "0",
          userUsdtBalance: "0",
          userAllowance: "0",
          error: "查询链上数据失败，请稍后重试",
        };
      }
    }),

  // ── 记录购买交易到数据库（前端完成链上操作后调用）──────────────────
  recordPurchase: publicProcedure
    .input(
      z.object({
        walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
        txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
        usdtAmount: z.string(),
        pvcAmount: z.string(),
        saleType: z.enum(["private", "public"]),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await recordTransaction({
          walletAddress: input.walletAddress.toLowerCase(),
          txHash: input.txHash,
          txType: input.saleType === "private" ? "purchase_private" : "purchase_public",
          amount: input.usdtAmount,
          tokenSymbol: "USDT",
          status: "pending",
        });
        // 推送运营通知
        notifyOwner({
          title: `🛒 新代币购买（${input.saleType === "private" ? "私募" : "公募"}）`,
          content: [
            `钱包：${input.walletAddress}`,
            `支付 USDT：${input.usdtAmount}`,
            `获得 PVC：${input.pvcAmount}`,
            `交易哈希：${input.txHash}`,
            `时间：${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`,
          ].join("\n"),
        }).catch((e) => console.warn("[Purchase] notifyOwner failed:", e));
        return { success: true };
      } catch (error) {
        console.error("[Purchase] 记录交易失败:", error);
        return { success: false, error: "记录失败，但链上交易已成功" };
      }
    }),

  // ── 确认交易状态（轮询链上确认）──────────────────────────────────────
  confirmTransaction: publicProcedure
    .input(z.object({ txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/) }))
    .query(async ({ input }) => {
      const { rpcUrl } = getContracts();
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const receipt = await provider.getTransactionReceipt(input.txHash);
        if (!receipt) return { status: "pending" as const };
        const confirmed = receipt.status === 1;
        return {
          status: confirmed ? ("confirmed" as const) : ("failed" as const),
          blockNumber: Number(receipt.blockNumber),
          gasUsed: receipt.gasUsed.toString(),
        };
      } catch {
        return { status: "pending" as const };
      }
    }),

  // ── 查询用户购买历史（数据库）──────────────────────────────────────
  getPurchaseHistory: publicProcedure
    .input(z.object({ walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/) }))
    .query(async ({ input }) => {
      const txs = await getTransactionsByWallet(input.walletAddress.toLowerCase());
      return txs.filter(
        (tx) => tx.txType === "purchase_private" || tx.txType === "purchase_public"
      );
    }),
});
