import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  getTransactionsByWallet,
  recordTransaction,
  updateTransactionStatus,
  getWalletsByUserId,
  bindWallet,
} from "../db";

export const dashboardRouter = router({
  // 记录一笔区块链交易
  recordTx: publicProcedure
    .input(
      z.object({
        walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
        txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
        txType: z.enum([
          "stake",
          "unstake",
          "claim_reward",
          "claim_dividend",
          "purchase_private",
          "purchase_public",
          "approve",
          "whitelist",
        ]),
        amount: z.string().optional(),
        tokenSymbol: z.string().optional(),
        status: z.enum(["pending", "confirmed", "failed"]).default("pending"),
      })
    )
    .mutation(async ({ input }) => {
      await recordTransaction({
        walletAddress: input.walletAddress.toLowerCase(),
        txHash: input.txHash,
        txType: input.txType,
        amount: input.amount,
        tokenSymbol: input.tokenSymbol,
        status: input.status,
      });
      return { success: true };
    }),

  // 确认交易状态
  confirmTx: publicProcedure
    .input(
      z.object({
        txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
        status: z.enum(["confirmed", "failed"]),
        blockNumber: z.number().optional(),
        gasUsed: z.string().optional(),
        errorMessage: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await updateTransactionStatus(input.txHash, input.status, {
        blockNumber: input.blockNumber,
        gasUsed: input.gasUsed,
        errorMessage: input.errorMessage,
        confirmedAt: input.status === "confirmed" ? new Date() : undefined,
      });
      return { success: true };
    }),

  // 查询钱包的交易历史
  getTxHistory: publicProcedure
    .input(z.object({ walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/) }))
    .query(async ({ input }) => {
      return getTransactionsByWallet(input.walletAddress);
    }),

  // 绑定钱包到当前登录用户
  bindWallet: protectedProcedure
    .input(
      z.object({
        walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "请输入有效的钱包地址"),
        isPrimary: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await bindWallet({
        userId: ctx.user.id,
        walletAddress: input.walletAddress.toLowerCase(),
        isPrimary: input.isPrimary ? "yes" : "no",
      });
      return { success: true };
    }),

  // 获取当前用户绑定的钱包列表
  getMyWallets: protectedProcedure.query(async ({ ctx }) => {
    return getWalletsByUserId(ctx.user.id);
  }),
});
