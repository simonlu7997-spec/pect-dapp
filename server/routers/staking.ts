import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { ethers } from "ethers";
import { recordTransaction, getTransactionsByWallet } from "../db";

// StakingManager ABI
const STAKING_MANAGER_ABI = [
  "function stakedAmount(address user) external view returns (uint256)",
  "function pendingReward(address user) external view returns (uint256)",
  "function totalStaked() external view returns (uint256)",
  "function apy() external view returns (uint256)",
  "function stake(uint256 amount) external",
  "function unstake(uint256 amount) external",
  "function claimReward() external",
  "function stakingToken() external view returns (address)",
];

// ERC20 ABI（C2-Coin 授权和余额）
const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
];

function getEnv() {
  return {
    rpcUrl: process.env.BLOCKCHAIN_RPC_URL || "https://rpc-amoy.polygon.technology",
    stakingManagerAddress: process.env.STAKING_MANAGER_ADDRESS,
    c2CoinAddress: process.env.C2_COIN_ADDRESS,
  };
}

export const stakingRouter = router({
  // ── 查询质押信息（已质押数量、待领取奖励、APY）────────────────────
  getStakingInfo: publicProcedure
    .input(z.object({ walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/) }))
    .query(async ({ input }) => {
      const { rpcUrl, stakingManagerAddress, c2CoinAddress } = getEnv();

      if (!stakingManagerAddress || !c2CoinAddress) {
        return {
          contractConfigured: false,
          stakedAmount: "0",
          pendingReward: "0",
          totalStaked: "0",
          apy: "12",
          c2Balance: "0",
          c2Allowance: "0",
        };
      }

      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const stakingManager = new ethers.Contract(
          stakingManagerAddress,
          STAKING_MANAGER_ABI,
          provider
        );
        const c2Coin = new ethers.Contract(c2CoinAddress, ERC20_ABI, provider);

        const [
          stakedRaw,
          pendingRewardRaw,
          totalStakedRaw,
          apyRaw,
          c2BalanceRaw,
          c2AllowanceRaw,
          c2Decimals,
        ] = await Promise.all([
          stakingManager.stakedAmount(input.walletAddress),
          stakingManager.pendingReward(input.walletAddress),
          stakingManager.totalStaked(),
          stakingManager.apy().catch(() => BigInt(1200)), // 默认 12%（基点 * 100）
          c2Coin.balanceOf(input.walletAddress),
          c2Coin.allowance(input.walletAddress, stakingManagerAddress),
          c2Coin.decimals(),
        ]);

        const stakedAmount = ethers.formatUnits(stakedRaw, c2Decimals);
        const pendingReward = ethers.formatUnits(pendingRewardRaw, 6); // USDT 6位
        const totalStaked = ethers.formatUnits(totalStakedRaw, c2Decimals);
        const apy = (Number(apyRaw) / 100).toFixed(2); // 基点转百分比
        const c2Balance = ethers.formatUnits(c2BalanceRaw, c2Decimals);
        const c2Allowance = ethers.formatUnits(c2AllowanceRaw, c2Decimals);

        return {
          contractConfigured: true,
          stakedAmount,
          pendingReward,
          totalStaked,
          apy,
          c2Balance,
          c2Allowance,
        };
      } catch (error) {
        console.error("[Staking] 查询质押信息失败:", error);
        return {
          contractConfigured: true,
          stakedAmount: "0",
          pendingReward: "0",
          totalStaked: "0",
          apy: "12",
          c2Balance: "0",
          c2Allowance: "0",
          error: "查询链上数据失败，请稍后重试",
        };
      }
    }),

  // ── 记录质押/解质押/领取奖励交易到数据库──────────────────────────
  recordStakingTx: publicProcedure
    .input(
      z.object({
        walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
        txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
        txType: z.enum(["stake", "unstake", "claim_reward"]),
        amount: z.string(),
        tokenSymbol: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await recordTransaction({
          walletAddress: input.walletAddress.toLowerCase(),
          txHash: input.txHash,
          txType: input.txType,
          amount: input.amount,
          tokenSymbol: input.tokenSymbol,
          status: "pending",
        });
        return { success: true };
      } catch (error) {
        console.error("[Staking] 记录质押交易失败:", error);
        return { success: false };
      }
    }),

  // ── 查询质押历史────────────────────────────────────────────────────
  getStakingHistory: publicProcedure
    .input(z.object({ walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/) }))
    .query(async ({ input }) => {
      const txs = await getTransactionsByWallet(input.walletAddress.toLowerCase());
      return txs.filter(
        (tx) => tx.txType === "stake" || tx.txType === "unstake" || tx.txType === "claim_reward"
      );
    }),
});
