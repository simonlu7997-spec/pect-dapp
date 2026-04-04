import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { ENV } from "../_core/env";
import { listAdminTransactions } from "../db";
import { runMonthlyStakingReward, runMonthlyRevenue } from "../rewardScheduler";
import { ethers } from "ethers";

// USDT ERC20 最小 ABI
const USDT_MINIMAL_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

// StakingManager 最小 ABI（只需要读取链上累计奖励数据）
const STAKING_MANAGER_MINIMAL_ABI = [
  "function lastRewardMonth() view returns (uint256)",
  "function getMonthlyRewardPool(uint256 month) view returns (uint256)",
  "function getTotalStaked() view returns (uint256)",
];

/**
 * 管理员奖励路由
 * - triggerStakingReward: 手动触发月度质押奖励计算
 * - triggerRevenue: 手动触发月度分红计算
 * - getRewardHistory: 查询质押奖励/分红执行历史
 * - getCumulativeStakingReward: 查询链上累计质押奖励总量
 * - getDeployerBalance: 查询 deployer 账户 USDT 余额和 allowance
 */
export const adminRewardRouter = router({
  /**
   * 手动触发月度质押奖励计算（仅管理员）
   */
  triggerStakingReward: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "仅管理员可操作" });
    }
    if (!ENV.blockchainRpcUrl || !ENV.deployerPrivateKey || !ENV.stakingManagerAddress) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "缺少区块链配置（BLOCKCHAIN_RPC_URL / DEPLOYER_PRIVATE_KEY / VITE_STAKING_MANAGER_ADDRESS）",
      });
    }
    // 异步执行，立即返回（避免 HTTP 超时）
    runMonthlyStakingReward("manual").then((result) => {
      console.log("[AdminReward] 质押奖励手动触发完成:", result);
    }).catch((err) => {
      console.error("[AdminReward] 质押奖励手动触发失败:", err);
    });
    return {
      success: true,
      message: "质押奖励计算任务已启动，请稍后查看执行历史确认结果",
    };
  }),

  /**
   * 手动触发月度分红计算（仅管理员）
   */
  triggerRevenue: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "仅管理员可操作" });
    }
    if (!ENV.blockchainRpcUrl || !ENV.deployerPrivateKey || !ENV.revenueDistributorAddress) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "缺少区块链配置（BLOCKCHAIN_RPC_URL / DEPLOYER_PRIVATE_KEY / VITE_REVENUE_DISTRIBUTOR_ADDRESS）",
      });
    }
    // 异步执行，立即返回（避免 HTTP 超时）
    runMonthlyRevenue("manual").then((result) => {
      console.log("[AdminReward] 分红手动触发完成:", result);
    }).catch((err) => {
      console.error("[AdminReward] 分红手动触发失败:", err);
    });
    return {
      success: true,
      message: "分红计算任务已启动，请稍后查看执行历史确认结果",
    };
  }),

  /**
   * 查询质押奖励/分红执行历史（最近 100 条）
   */
  getRewardHistory: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "仅管理员可查看" });
    }
    const allTx = await listAdminTransactions(100);
    // 返回质押奖励和分红相关的记录
    return allTx.filter(
      (tx) => tx.txType === "distribute_staking_reward" || tx.txType === "distribute_revenue"
    );
  }),

  /**
   * 查询链上累计质押奖励总量（仅管理员）
   * 通过遍历 StakingManager 合约的历史月份 monthlyRewardPool 累加
   */
  getCumulativeStakingReward: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "仅管理员可查看" });
    }
    if (!ENV.blockchainRpcUrl || !ENV.stakingManagerAddress) {
      return {
        cumulativeRewardUsdt: "0",
        lastRewardMonth: 0,
        monthlyBreakdown: [] as { month: number; amountUsdt: string }[],
        error: "区块链 RPC 或合约地址未配置",
      };
    }

    try {
      const provider = new ethers.JsonRpcProvider(ENV.blockchainRpcUrl);
      const contract = new ethers.Contract(
        ENV.stakingManagerAddress,
        STAKING_MANAGER_MINIMAL_ABI,
        provider
      );

      // 获取最近一次奖励月份（格式：YYYYMM，如 202603）
      const lastMonthRaw: bigint = await contract.lastRewardMonth();
      const lastMonth = Number(lastMonthRaw);

      if (lastMonth === 0) {
        return {
          cumulativeRewardUsdt: "0",
          lastRewardMonth: 0,
          monthlyBreakdown: [] as { month: number; amountUsdt: string }[],
          error: null,
        };
      }

      // 解析 YYYYMM 格式，从合约部署起始月（2026年1月）遍历到最近奖励月
      const startYear = 2026;
      const startMonth = 1;
      const lastYear = Math.floor(lastMonth / 100);
      const lastMonthNum = lastMonth % 100;

      const months: number[] = [];
      let y = startYear;
      let m = startMonth;
      while (y < lastYear || (y === lastYear && m <= lastMonthNum)) {
        months.push(y * 100 + m);
        m++;
        if (m > 12) { m = 1; y++; }
      }

      // 并发查询各月奖励池（USDT 6位精度）
      const poolResults = await Promise.all(
        months.map((month) =>
          contract.getMonthlyRewardPool(month).catch(() => BigInt(0))
        )
      );

      const monthlyBreakdown = months
        .map((month, i) => ({
          month,
          amountUsdt: ethers.formatUnits(poolResults[i], 6),
        }))
        .filter((item) => parseFloat(item.amountUsdt) > 0);

      const totalWei = poolResults.reduce((acc, v) => acc + v, BigInt(0));
      const cumulativeRewardUsdt = ethers.formatUnits(totalWei, 6);

      return {
        cumulativeRewardUsdt,
        lastRewardMonth: lastMonth,
        monthlyBreakdown,
        error: null,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[AdminReward] 查询链上累计质押奖励失败:", message);
      return {
        cumulativeRewardUsdt: "0",
        lastRewardMonth: 0,
        monthlyBreakdown: [] as { month: number; amountUsdt: string }[],
        error: `链上查询失败：${message.slice(0, 100)}`,
      };
    }
  }),

  /**
   * 查询 deployer 账户的 USDT 余额和对 RevenueDistributor 的 allowance（仅管理员）
   */
  getDeployerBalance: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "仅管理员可查看" });
    }
    if (!ENV.blockchainRpcUrl || !ENV.usdtAddress || !ENV.revenueDistributorAddress || !ENV.deployerPrivateKey) {
      return {
        deployerAddress: "",
        usdtBalance: "0",
        allowance: "0",
        error: "区块链 RPC 或合约地址未配置",
      };
    }
    try {
      const provider = new ethers.JsonRpcProvider(ENV.blockchainRpcUrl);
      const deployerWallet = new ethers.Wallet(ENV.deployerPrivateKey, provider);
      const deployerAddress = deployerWallet.address;
      const usdtContract = new ethers.Contract(ENV.usdtAddress, USDT_MINIMAL_ABI, provider);

      const [balanceRaw, allowanceRaw] = await Promise.all([
        usdtContract.balanceOf(deployerAddress),
        usdtContract.allowance(deployerAddress, ENV.revenueDistributorAddress),
      ]);

      const usdtBalance = ethers.formatUnits(balanceRaw, 6);
      const allowanceFormatted = ethers.formatUnits(allowanceRaw, 6);

      return {
        deployerAddress,
        usdtBalance,
        allowance: allowanceFormatted,
        error: null,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[AdminReward] 查询 deployer 余额失败:", message);
      return {
        deployerAddress: "",
        usdtBalance: "0",
        allowance: "0",
        error: `链上查询失败：${message.slice(0, 100)}`,
      };
    }
  }),
});
