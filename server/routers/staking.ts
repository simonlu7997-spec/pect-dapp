import { router, publicProcedure } from "../_core/trpc";
import { notifyOwner } from "../_core/notification";
import { z } from "zod";
import { ethers } from "ethers";
import { recordTransaction, getTransactionsByWallet } from "../db";

// StakingManager ABI（与合约实际函数名保持一致）
const STAKING_MANAGER_ABI = [
  "function getStakedAmount(address _user) external view returns (uint256)",
  "function getTotalStaked() public view returns (uint256)",
  "function getUserMonthlyReward(address user, uint256 month) external view returns (uint256)",
  "function isMonthlyRewardClaimed(address user, uint256 month) external view returns (bool)",
  "function getMonthlyRewardPool(uint256 month) external view returns (uint256)",
  "function lastRewardMonth() external view returns (uint256)",
  "function getCurrentMonth() public view returns (uint256)",
  "function stake(uint256 amount) external",
  "function unstake(uint256 amount) external",
  "function claimStakingReward(uint256 month) external",
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

/** 将 YYYYMM 格式月份转为可读字符串，如 202604 → "2026年4月" */
function formatYearMonth(ym: number): string {
  const year = Math.floor(ym / 100);
  const month = ym % 100;
  return `${year}年${month}月`;
}

export const stakingRouter = router({
  // ── 查询质押基本信息（余额、已质押、总质押）────────────────────────
  getStakingInfo: publicProcedure
    .input(z.object({ walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/) }))
    .query(async ({ input }) => {
      const { rpcUrl, stakingManagerAddress, c2CoinAddress } = getEnv();

      if (!stakingManagerAddress || !c2CoinAddress) {
        return {
          contractConfigured: false,
          stakedAmount: "0",
          totalStaked: "0",
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
          totalStakedRaw,
          c2BalanceRaw,
          c2AllowanceRaw,
          c2Decimals,
        ] = await Promise.all([
          stakingManager.getStakedAmount(input.walletAddress),
          stakingManager.getTotalStaked(),
          c2Coin.balanceOf(input.walletAddress),
          c2Coin.allowance(input.walletAddress, stakingManagerAddress),
          c2Coin.decimals(),
        ]);

        const stakedAmount = ethers.formatUnits(stakedRaw, c2Decimals);
        const totalStaked = ethers.formatUnits(totalStakedRaw, c2Decimals);
        const c2Balance = ethers.formatUnits(c2BalanceRaw, c2Decimals);
        const c2Allowance = ethers.formatUnits(c2AllowanceRaw, c2Decimals);

        return {
          contractConfigured: true,
          stakedAmount,
          totalStaked,
          c2Balance,
          c2Allowance,
        };
      } catch (error) {
        console.error("[Staking] 查询质押信息失败:", error);
        return {
          contractConfigured: true,
          stakedAmount: "0",
          totalStaked: "0",
          c2Balance: "0",
          c2Allowance: "0",
          error: "查询链上数据失败，请稍后重试",
        };
      }
    }),

  // ── 查询所有历史月份的质押奖励状态────────────────────────────────
  getAllMonthlyStakingRewards: publicProcedure
    .input(z.object({ walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/) }))
    .query(async ({ input }) => {
      const { rpcUrl, stakingManagerAddress } = getEnv();

      if (!stakingManagerAddress) {
        return { months: [], totalClaimable: "0" };
      }

      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const stakingManager = new ethers.Contract(
          stakingManagerAddress,
          STAKING_MANAGER_ABI,
          provider
        );

        // 获取最近一次奖励月份
        const lastRewardMonthRaw = await stakingManager.lastRewardMonth().catch(() => BigInt(0));
        const lastRewardMonth = Number(lastRewardMonthRaw);

        if (lastRewardMonth === 0) {
          return { months: [], totalClaimable: "0" };
        }

        // 从项目上线月份（202604）开始遍历到最近奖励月份
        const startMonth = 202604;
        const months: Array<{
          month: number;
          monthLabel: string;
          rewardAmount: string;
          isClaimed: boolean;
          rewardPool: string;
        }> = [];

        // 收集需要查询的月份列表
        const monthList: number[] = [];
        let m = startMonth;
        while (m <= lastRewardMonth) {
          monthList.push(m);
          // 下一个月
          const year = Math.floor(m / 100);
          const month = m % 100;
          m = month === 12 ? (year + 1) * 100 + 1 : year * 100 + (month + 1);
        }

        // 并发查询每个月份的奖励信息
        await Promise.all(
          monthList.map(async (ym) => {
            const [rewardRaw, isClaimed, poolRaw] = await Promise.all([
              stakingManager.getUserMonthlyReward(input.walletAddress, ym).catch(() => BigInt(0)),
              stakingManager.isMonthlyRewardClaimed(input.walletAddress, ym).catch(() => false),
              stakingManager.getMonthlyRewardPool(ym).catch(() => BigInt(0)),
            ]);
            const rewardAmount = ethers.formatUnits(rewardRaw, 6); // USDT 6位
            const rewardPool = ethers.formatUnits(poolRaw, 6);
            months.push({
              month: ym,
              monthLabel: formatYearMonth(ym),
              rewardAmount,
              isClaimed: Boolean(isClaimed),
              rewardPool,
            });
          })
        );

        // 按月份排序
        months.sort((a, b) => a.month - b.month);

        // 计算总可领取金额
        const totalClaimable = months
          .filter((m) => !m.isClaimed && parseFloat(m.rewardAmount) > 0)
          .reduce((sum, m) => sum + parseFloat(m.rewardAmount), 0)
          .toFixed(6);

        return { months, totalClaimable };
      } catch (error) {
        console.error("[Staking] 查询历史质押奖励失败:", error);
        return { months: [], totalClaimable: "0" };
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
        // 推送运营通知
        const actionLabel = input.txType === "stake" ? "质押" : input.txType === "unstake" ? "解除质押" : "领取质押奖励";
        notifyOwner({
          title: `📊 用户${actionLabel} C2-Coin`,
          content: [
            `钱包：${input.walletAddress}`,
            `操作：${actionLabel}`,
            `金额：${input.amount} ${input.tokenSymbol}`,
            `交易哈希：${input.txHash}`,
            `时间：${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`,
          ].join("\n"),
        }).catch((e) => console.warn("[Staking] notifyOwner failed:", e));
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
