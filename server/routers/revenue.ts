import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { ethers } from "ethers";
import { recordTransaction, getTransactionsByWallet } from "../db";

// RevenueDistributor ABI（查询和领取分红）
const REVENUE_DISTRIBUTOR_ABI = [
  "function claimableAmount(address user) external view returns (uint256)",
  "function totalDistributed() external view returns (uint256)",
  "function lastDistributionTime() external view returns (uint256)",
  "function nextDistributionTime() external view returns (uint256)",
  "function claim() external",
  "function hasClaimed(address user, uint256 period) external view returns (bool)",
  "function currentPeriod() external view returns (uint256)",
];

// PV-Coin (PVC) ERC20 ABI
const PVC_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
];

// C2-Coin ERC20 ABI
const C2_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
];

function getEnv() {
  return {
    rpcUrl: process.env.BLOCKCHAIN_RPC_URL || "https://rpc-amoy.polygon.technology",
    revenueDistributorAddress: process.env.REVENUE_DISTRIBUTOR_ADDRESS,
    pvCoinAddress: process.env.PV_COIN_ADDRESS,
    c2CoinAddress: process.env.C2_COIN_ADDRESS,
    usdtAddress: process.env.USDT_ADDRESS,
  };
}

export const revenueRouter = router({
  // ── 查询用户分红信息（持仓 + 待领取金额）────────────────────────────
  getRevenueInfo: publicProcedure
    .input(z.object({ walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/) }))
    .query(async ({ input }) => {
      const { rpcUrl, revenueDistributorAddress, pvCoinAddress, c2CoinAddress } = getEnv();

      // 合约未配置时返回默认值
      if (!revenueDistributorAddress || !pvCoinAddress) {
        return {
          contractConfigured: false,
          pvBalance: "0",
          pvTotalSupply: "0",
          holdingPercent: "0",
          claimableUsdt: "0",
          totalDistributed: "0",
          lastDistributionTime: null as number | null,
          nextDistributionTime: null as number | null,
          currentPeriod: 0,
          hasClaimed: false,
          c2Balance: "0",
        };
      }

      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const revenueDistributor = new ethers.Contract(
          revenueDistributorAddress,
          REVENUE_DISTRIBUTOR_ABI,
          provider
        );
        const pvCoin = new ethers.Contract(pvCoinAddress, PVC_ABI, provider);

        const [
          pvBalance,
          pvTotalSupply,
          pvDecimals,
          claimableRaw,
          totalDistributedRaw,
        ] = await Promise.all([
          pvCoin.balanceOf(input.walletAddress),
          pvCoin.totalSupply(),
          pvCoin.decimals(),
          revenueDistributor.claimableAmount(input.walletAddress).catch(() => BigInt(0)),
          revenueDistributor.totalDistributed().catch(() => BigInt(0)),
        ]);

        // 可选字段（合约可能不支持）
        let lastDistributionTime: number | null = null;
        let nextDistributionTime: number | null = null;
        let currentPeriod = 0;
        let hasClaimed = false;

        try {
          const [last, next, period] = await Promise.all([
            revenueDistributor.lastDistributionTime(),
            revenueDistributor.nextDistributionTime(),
            revenueDistributor.currentPeriod(),
          ]);
          lastDistributionTime = Number(last) * 1000; // 转为毫秒
          nextDistributionTime = Number(next) * 1000;
          currentPeriod = Number(period);
          hasClaimed = await revenueDistributor.hasClaimed(input.walletAddress, currentPeriod);
        } catch {
          // 合约不支持这些字段，忽略
        }

        // C2-Coin 余额（可选）
        let c2Balance = "0";
        if (c2CoinAddress) {
          try {
            const c2Coin = new ethers.Contract(c2CoinAddress, C2_ABI, provider);
            const [c2Bal, c2Dec] = await Promise.all([
              c2Coin.balanceOf(input.walletAddress),
              c2Coin.decimals(),
            ]);
            c2Balance = ethers.formatUnits(c2Bal, c2Dec);
          } catch {
            // 忽略
          }
        }

        const pvBalanceFormatted = ethers.formatUnits(pvBalance, pvDecimals);
        const pvTotalSupplyFormatted = ethers.formatUnits(pvTotalSupply, pvDecimals);
        const holdingPercent =
          Number(pvTotalSupply) > 0
            ? ((Number(pvBalance) / Number(pvTotalSupply)) * 100).toFixed(4)
            : "0";

        // USDT 精度（6 位）
        const claimableUsdt = ethers.formatUnits(claimableRaw, 6);
        const totalDistributed = ethers.formatUnits(totalDistributedRaw, 6);

        return {
          contractConfigured: true,
          pvBalance: pvBalanceFormatted,
          pvTotalSupply: pvTotalSupplyFormatted,
          holdingPercent,
          claimableUsdt,
          totalDistributed,
          lastDistributionTime,
          nextDistributionTime,
          currentPeriod,
          hasClaimed,
          c2Balance,
        };
      } catch (error) {
        console.error("[Revenue] 查询分红信息失败:", error);
        return {
          contractConfigured: true,
          pvBalance: "0",
          pvTotalSupply: "0",
          holdingPercent: "0",
          claimableUsdt: "0",
          totalDistributed: "0",
          lastDistributionTime: null as number | null,
          nextDistributionTime: null as number | null,
          currentPeriod: 0,
          hasClaimed: false,
          c2Balance: "0",
          error: "查询链上数据失败，请稍后重试",
        };
      }
    }),

  // ── 记录领取分红交易到数据库────────────────────────────────────────
  recordClaim: publicProcedure
    .input(
      z.object({
        walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
        txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
        usdtAmount: z.string(),
        claimType: z.enum(["dividend", "staking_reward"]),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await recordTransaction({
          walletAddress: input.walletAddress.toLowerCase(),
          txHash: input.txHash,
          txType: input.claimType === "dividend" ? "claim_dividend" : "claim_reward",
          amount: input.usdtAmount,
          tokenSymbol: "USDT",
          status: "pending",
        });
        return { success: true };
      } catch (error) {
        console.error("[Revenue] 记录领取交易失败:", error);
        return { success: false };
      }
    }),

  // ── 查询领取历史────────────────────────────────────────────────────
  getClaimHistory: publicProcedure
    .input(z.object({ walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/) }))
    .query(async ({ input }) => {
      const txs = await getTransactionsByWallet(input.walletAddress.toLowerCase());
      return txs.filter(
        (tx) => tx.txType === "claim_dividend" || tx.txType === "claim_reward"
      );
    }),
});
