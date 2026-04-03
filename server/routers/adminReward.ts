import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { ENV } from "../_core/env";
import { listAdminTransactions } from "../db";
import { runMonthlyStakingReward, runMonthlyRevenue } from "../rewardScheduler";

/**
 * 管理员奖励路由
 * - triggerStakingReward: 手动触发月度质押奖励计算
 * - triggerRevenue: 手动触发月度分红计算
 * - getRewardHistory: 查询质押奖励/分红执行历史
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
});
