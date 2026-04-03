import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { ENV } from "../_core/env";
import { listAdminTransactions } from "../db";
import { runMonthlyAirdrop } from "../airdropScheduler";

/**
 * 管理员空投路由
 * - triggerAirdrop: 手动触发月度 C2Coin 空投计算
 * - getAirdropHistory: 查询空投执行历史
 */
export const adminAirdropRouter = router({
  /**
   * 手动触发月度 C2Coin 空投计算（仅管理员）
   */
  triggerAirdrop: protectedProcedure.mutation(async ({ ctx }) => {
    // 仅管理员可触发
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "仅管理员可操作" });
    }

    // 检查区块链配置
    if (!ENV.blockchainRpcUrl || !ENV.deployerPrivateKey || !ENV.c2CoinAddress) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "缺少区块链配置（BLOCKCHAIN_RPC_URL / DEPLOYER_PRIVATE_KEY / VITE_C2_COIN_ADDRESS）",
      });
    }

    // 异步执行，立即返回（避免 HTTP 超时）
    runMonthlyAirdrop("manual").then((result) => {
      console.log("[AdminAirdrop] 手动触发完成:", result);
    }).catch((err) => {
      console.error("[AdminAirdrop] 手动触发失败:", err);
    });

    return {
      success: true,
      message: "空投计算任务已启动，请稍后查看执行历史确认结果",
    };
  }),

  /**
   * 查询空投执行历史（最近 50 条）
   */
  getAirdropHistory: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "仅管理员可查看" });
    }

    const allTx = await listAdminTransactions(100);
    // 只返回 airdrop_calculate 类型的记录
    return allTx.filter((tx) => tx.txType === "airdrop_calculate");
  }),
});
