import { router, publicProcedure } from "../_core/trpc";
import { notifyOwner } from "../_core/notification";
import { z } from "zod";
import { ethers } from "ethers";
import { recordTransaction, getTransactionsByWallet } from "../db";

// RevenueDistributor ABI（查询和领取分红）
// 合约函数：getUserMonthlyRevenue(address user, uint256 month) → uint256
//           isMonthlyRevenueClaimed(address user, uint256 month) → bool
//           lastDistributionMonth() → uint256
//           getCurrentMonth() → uint256
//           getMonthlyRevenuePool(uint256 month) → uint256
//           claimRevenue(uint256 month) → void
const REVENUE_DISTRIBUTOR_ABI = [
  "function getUserMonthlyRevenue(address user, uint256 month) external view returns (uint256)",
  "function isMonthlyRevenueClaimed(address user, uint256 month) external view returns (bool)",
  "function userMonthlyRevenue(address user, uint256 month) external view returns (uint256)",
  "function userMonthlyRevenueClaimed(address user, uint256 month) external view returns (bool)",
  "function lastDistributionMonth() external view returns (uint256)",
  "function getCurrentMonth() external view returns (uint256)",
  "function getMonthlyRevenuePool(uint256 month) external view returns (uint256)",
  "function monthlyRevenuePool(uint256 month) external view returns (uint256)",
  "function claimRevenue(uint256 month) external",
  "function adjustablePvcTotalSupply() external view returns (uint256)",
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

/**
 * 获取当前年月（YYYYMM 格式），与合约 getCurrentMonth() 保持一致
 * 合约使用 UTC 时间，这里也用 UTC
 */
function getCurrentYearMonth(): number {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  return year * 100 + month;
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
          lastDistributionMonth: 0,
          currentMonth: 0,
          hasClaimed: false,
          c2Balance: "0",
          claimMonth: 0,
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

        // 获取上月（lastDistributionMonth）作为可领取月份
        // 合约的 lastDistributionMonth 就是最近一次 startDistribution 的月份
        const [
          pvBalance,
          pvTotalSupply,
          pvDecimals,
          lastDistMonth,
          onChainCurrentMonth,
        ] = await Promise.all([
          pvCoin.balanceOf(input.walletAddress),
          pvCoin.totalSupply(),
          pvCoin.decimals(),
          revenueDistributor.lastDistributionMonth().catch(() => BigInt(0)),
          revenueDistributor.getCurrentMonth().catch(() => BigInt(0)),
        ]);

        const claimMonth = Number(lastDistMonth); // 最近分红月份，如 202604

        // 查询该月份的可领取金额和是否已领取
        let claimableRaw = BigInt(0);
        let hasClaimed = false;

        if (claimMonth > 0) {
          [claimableRaw, hasClaimed] = await Promise.all([
            revenueDistributor.getUserMonthlyRevenue(input.walletAddress, BigInt(claimMonth))
              .catch(() => BigInt(0)),
            revenueDistributor.isMonthlyRevenueClaimed(input.walletAddress, BigInt(claimMonth))
              .catch(async () => {
                // 尝试备用函数名
                return revenueDistributor.userMonthlyRevenueClaimed(input.walletAddress, BigInt(claimMonth))
                  .catch(() => false);
              }),
          ]);

          // 如果已领取，可领取金额应为 0
          if (hasClaimed) {
            claimableRaw = BigInt(0);
          }
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

        return {
          contractConfigured: true,
          pvBalance: pvBalanceFormatted,
          pvTotalSupply: pvTotalSupplyFormatted,
          holdingPercent,
          claimableUsdt,
          totalDistributed: "0", // 合约无此字段，保留兼容
          lastDistributionMonth: Number(lastDistMonth),
          currentMonth: Number(onChainCurrentMonth),
          hasClaimed,
          c2Balance,
          claimMonth, // 前端领取时需要传入此月份
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
          lastDistributionMonth: 0,
          currentMonth: 0,
          hasClaimed: false,
          c2Balance: "0",
          claimMonth: 0,
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
        // 推送运营通知
        notifyOwner({
          title: input.claimType === "dividend" ? "💰 用户领取分红" : "💰 用户领取质押奖励",
          content: [
            `钱包：${input.walletAddress}`,
            `金额：${input.usdtAmount} USDT`,
            `交易哈希：${input.txHash}`,
            `时间：${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`,
          ].join("\n"),
        }).catch((e) => console.warn("[Revenue] notifyOwner failed:", e));
        return { success: true };
      } catch (error) {
        console.error("[Revenue] 记录领取交易失败:", error);
        return { success: false };
      }
    }),

  // ── 查询用户所有历史月份分红状态─────────────────────────────────────────────────────────────
  // 返回每个分红月份的可领取金额和是否已领取，支持用户领取历史未领取的分红
  getAllMonthlyRevenue: publicProcedure
    .input(z.object({ walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/) }))
    .query(async ({ input }) => {
      const { rpcUrl, revenueDistributorAddress } = getEnv();

      if (!revenueDistributorAddress) {
        return { months: [] };
      }

      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const revenueDistributor = new ethers.Contract(
          revenueDistributorAddress,
          REVENUE_DISTRIBUTOR_ABI,
          provider
        );

        // 获取最近分红月份和当前月份
        const [lastDistMonth, onChainCurrentMonth] = await Promise.all([
          revenueDistributor.lastDistributionMonth().catch(() => BigInt(0)),
          revenueDistributor.getCurrentMonth().catch(() => BigInt(0)),
        ]);

        const lastMonth = Number(lastDistMonth);
        const currentMonth = Number(onChainCurrentMonth);

        if (lastMonth === 0) {
          return { months: [] };
        }

        // 生成从项目上线月份到最近分红月份的所有月份列表
        // 项目上线于 2026 年 4 月，所以从 202604 开始向前遇历
        // 如果 lastMonth < 202604，则从 lastMonth 开始；否则从 202604 开始
        const START_MONTH = 202604; // 项目上线第一个分红月份
        const fromMonth = Math.min(lastMonth, START_MONTH);

        // 生成月份列表（从 fromMonth 到 lastMonth）
        const monthList: number[] = [];
        let m = fromMonth;
        while (m <= lastMonth) {
          monthList.push(m);
          // 月份递增：202604 → 202605 → ... → 202612 → 202701
          const year = Math.floor(m / 100);
          const month = m % 100;
          if (month === 12) {
            m = (year + 1) * 100 + 1;
          } else {
            m = year * 100 + (month + 1);
          }
        }

        // 并发查询每个月份的分红金额和领取状态
        const results = await Promise.all(
          monthList.map(async (month) => {
            const [revenueRaw, claimed] = await Promise.all([
              revenueDistributor.getUserMonthlyRevenue(
                input.walletAddress,
                BigInt(month)
              ).catch(() => BigInt(0)),
              revenueDistributor.isMonthlyRevenueClaimed(
                input.walletAddress,
                BigInt(month)
              ).catch(async () =>
                revenueDistributor.userMonthlyRevenueClaimed(
                  input.walletAddress,
                  BigInt(month)
                ).catch(() => false)
              ),
            ]);

            const revenueUsdt = ethers.formatUnits(revenueRaw, 6);
            const yearStr = String(month).slice(0, 4);
            const monthStr = String(month).slice(4);

            return {
              month,
              label: `${yearStr}年${monthStr}月`,
              revenueUsdt,
              claimed: Boolean(claimed),
              claimable: !claimed && Number(revenueRaw) > 0,
            };
          })
        );

        // 只返回有分红记录的月份（金额 > 0）
        const monthsWithRevenue = results.filter((r) => Number(r.revenueUsdt) > 0);

        return {
          months: monthsWithRevenue,
          currentMonth,
          lastDistributionMonth: lastMonth,
        };
      } catch (error) {
        console.error("[Revenue] 查询历史分红失败:", error);
        return { months: [] };
      }
    }),

  // ── 查询领取历史────────────────────────────────────────────────────────────────────
  getClaimHistory: publicProcedure
    .input(z.object({ walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/) }))
    .query(async ({ input }) => {
      const txs = await getTransactionsByWallet(input.walletAddress.toLowerCase());
      return txs.filter(
        (tx) => tx.txType === "claim_dividend" || tx.txType === "claim_reward"
      );
    }),
});
