import { router, publicProcedure } from "../_core/trpc";
import { notifyOwner } from "../_core/notification";
import { z } from "zod";
import { ethers } from "ethers";
import { recordTransaction, getTransactionsByWallet } from "../db";

/**
 * C2Coin 合约 ABI（内置空投功能）
 * 空投相关函数直接在 C2Coin 合约中，无需独立的 Airdrop 合约
 */
const C2COIN_AIRDROP_ABI = [
  // 查询用户某月可领取的 C2Coin 数量
  "function getUserMonthlyReward(address user, uint256 yearMonth) external view returns (uint256)",
  // 查询用户某月是否已领取
  "function isMonthlyRewardClaimed(address user, uint256 yearMonth) external view returns (bool)",
  // 查询某月的 C2Coin 总池
  "function getMonthlyC2CoinPool(uint256 yearMonth) external view returns (uint256)",
  // 最新发行的年月（YYYYMM 格式）
  "function lastIssuanceYearMonth() external view returns (uint256)",
  // 领取空投
  "function claimC2Coin(uint256 yearMonth) external",
  // ERC20 基础
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external pure returns (uint8)",
  "function symbol() external view returns (string)",
  "function totalSupply() external view returns (uint256)",
];

function getEnv() {
  return {
    rpcUrl: process.env.BLOCKCHAIN_RPC_URL || "https://rpc-amoy.polygon.technology",
    c2CoinAddress: process.env.C2_COIN_ADDRESS || process.env.VITE_C2_COIN_ADDRESS,
  };
}

export const airdropRouter = router({
  // ── 查询空投信息（链上实时数据）────────────────────────────────────
  getAirdropInfo: publicProcedure
    .input(z.object({ walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/) }))
    .query(async ({ input }) => {
      const { rpcUrl, c2CoinAddress } = getEnv();

      if (!c2CoinAddress) {
        return {
          contractConfigured: false,
          isActive: false,
          isClaimed: false,
          claimableAmount: "0",
          totalAirdrop: "0",
          totalClaimed: "0",
          claimDeadline: null as number | null,
          c2Balance: "0",
          c2Symbol: "C2C",
          currentYearMonth: 0,
        };
      }

      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const c2Coin = new ethers.Contract(c2CoinAddress, C2COIN_AIRDROP_ABI, provider);

        // 获取 decimals 和 symbol
        const [c2DecimalsRaw, c2Symbol] = await Promise.all([
          c2Coin.decimals().catch(() => 18),
          c2Coin.symbol().catch(() => "C2C"),
        ]);
        const decimals = Number(c2DecimalsRaw);

        // 获取最新发行年月（YYYYMM 格式）
        const lastYearMonth = await c2Coin.lastIssuanceYearMonth().catch(() => BigInt(0));
        const currentYearMonth = Number(lastYearMonth);

        if (currentYearMonth === 0) {
          // 还没有发行过空投
          const c2BalRaw = await c2Coin.balanceOf(input.walletAddress).catch(() => BigInt(0));
          return {
            contractConfigured: true,
            isActive: false,
            isClaimed: false,
            claimableAmount: "0",
            totalAirdrop: "0",
            totalClaimed: "0",
            claimDeadline: null as number | null,
            c2Balance: ethers.formatUnits(c2BalRaw, decimals),
            c2Symbol: String(c2Symbol),
            currentYearMonth: 0,
          };
        }

        // 并行查询用户当月数据
        const [claimableRaw, isClaimed, totalPoolRaw, c2BalRaw] = await Promise.all([
          c2Coin.getUserMonthlyReward(input.walletAddress, currentYearMonth).catch(() => BigInt(0)),
          c2Coin.isMonthlyRewardClaimed(input.walletAddress, currentYearMonth).catch(() => false),
          c2Coin.getMonthlyC2CoinPool(currentYearMonth).catch(() => BigInt(0)),
          c2Coin.balanceOf(input.walletAddress).catch(() => BigInt(0)),
        ]);

        return {
          contractConfigured: true,
          isActive: true,
          isClaimed: Boolean(isClaimed),
          claimableAmount: ethers.formatUnits(claimableRaw, decimals),
          totalAirdrop: ethers.formatUnits(totalPoolRaw, decimals),
          totalClaimed: "0",
          claimDeadline: null as number | null,
          c2Balance: ethers.formatUnits(c2BalRaw, decimals),
          c2Symbol: String(c2Symbol),
          currentYearMonth,
        };
      } catch (error) {
        console.error("[Airdrop] 查询空投信息失败:", error);
        return {
          contractConfigured: true,
          isActive: false,
          isClaimed: false,
          claimableAmount: "0",
          totalAirdrop: "0",
          totalClaimed: "0",
          claimDeadline: null as number | null,
          c2Balance: "0",
          c2Symbol: "C2C",
          currentYearMonth: 0,
          error: "查询链上数据失败，请稍后重试",
        };
      }
    }),

  // ── 记录空投领取交易到数据库────────────────────────────────────────
  recordAirdropClaim: publicProcedure
    .input(
      z.object({
        walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
        txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
        c2Amount: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await recordTransaction({
          walletAddress: input.walletAddress.toLowerCase(),
          txHash: input.txHash,
          txType: "airdrop_claim",
          amount: input.c2Amount,
          tokenSymbol: "C2C",
          status: "pending",
        });
        // 推送运营通知
        notifyOwner({
          title: "🎁 用户领取 C2-Coin 空投",
          content: [
            `钱包：${input.walletAddress}`,
            `金额：${input.c2Amount} C2C`,
            `交易哈希：${input.txHash}`,
            `时间：${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`,
          ].join("\n"),
        }).catch((e) => console.warn("[Airdrop] notifyOwner failed:", e));
        return { success: true };
      } catch (error) {
        console.error("[Airdrop] 记录空投领取失败:", error);
        return { success: false, error: "记录失败，但链上交易已成功" };
      }
    }),

  // ── 查询空投领取历史────────────────────────────────────────────────
  getAirdropHistory: publicProcedure
    .input(z.object({ walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/) }))
    .query(async ({ input }) => {
      const txs = await getTransactionsByWallet(input.walletAddress.toLowerCase());
      return txs.filter((tx) => tx.txType === "airdrop_claim");
    }),
});
