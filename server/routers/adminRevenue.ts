import { router, protectedProcedure } from "../_core/trpc";
import { notifyOwner } from "../_core/notification";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createRevenueRecord,
  listRevenueRecords,
  getRevenueRecordByPeriod,
  deleteRevenueRecord,
  recordAdminTransaction,
  listAdminTransactions,
  updateAdminTransactionStatus,
} from "../db";
import { ethers } from "ethers";
import { ENV } from "../_core/env";

// RevenueDistributor 合约 ABI（管理员相关函数）
const RevenueDistributorABI = [
  "function startDistribution(uint256 _totalAmount) external",
  "function lastDistributionMonth() view returns (uint256)",
  "function getMonthlyRevenuePool(uint256 month) view returns (uint256)",
];

// StakingManager 合约 ABI（管理员发放奖励函数）
const StakingManagerABI = [
  "function startMonthlyReward(uint256 _totalReward) external",
  "function getTotalStaked() view returns (uint256)",
  "function lastRewardMonth() view returns (uint256)",
  "function getMonthlyRewardPool(uint256 month) view returns (uint256)",
];

// ERC20 最小 ABI（用于查询代币精度）
const ERC20_MINIMAL_ABI = [
  "function decimals() view returns (uint8)",
];

// 管理员权限检查中间件
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要管理员权限" });
  }
  return next({ ctx });
});

export const adminRevenueRouter = router({
  // 查询分红期列表
  list: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(24) }).optional())
    .query(async ({ input }) => {
      const records = await listRevenueRecords(input?.limit ?? 24);
      return { records };
    }),

  // 录入新一期分红数据
  create: adminProcedure
    .input(
      z.object({
        periodYear: z.number().int().min(2020).max(2100),
        periodMonth: z.number().int().min(1).max(12),
        totalGeneration: z.string().regex(/^\d+(\.\d+)?$/, "请输入有效的发电量"),
        totalRevenue: z.string().regex(/^\d+(\.\d+)?$/, "请输入有效的收入金额"),
        dividendPool: z.string().regex(/^\d+(\.\d+)?$/, "请输入有效的分红金额"),
        stakingRewardAmount: z.string().regex(/^\d+(\.\d+)?$/, "请输入有效的质押奖励金额").optional(),
        exchangeRate: z.string().regex(/^\d+(\.\d+)?$/, "请输入有效的汇率"),
        snapshotBlock: z.number().int().positive().optional(),
        txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
        note: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 检查同期是否已存在
      const existing = await getRevenueRecordByPeriod(input.periodYear, input.periodMonth);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `${input.periodYear}-${String(input.periodMonth).padStart(2, "0")} 期数据已存在`,
        });
      }

      const periodLabel = `${input.periodYear}-${String(input.periodMonth).padStart(2, "0")}`;

      await createRevenueRecord({
        periodLabel,
        periodYear: input.periodYear,
        periodMonth: input.periodMonth,
        totalGeneration: input.totalGeneration,
        totalRevenue: input.totalRevenue,
        dividendPool: input.dividendPool,
        stakingRewardAmount: input.stakingRewardAmount ?? null,
        exchangeRate: input.exchangeRate,
        snapshotBlock: input.snapshotBlock ?? null,
        txHash: input.txHash ?? null,
        note: input.note ?? null,
        createdBy: ctx.user.openId,
      });

      return { success: true, periodLabel };
    }),

  // 删除分红期数据
  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await deleteRevenueRecord(input.id);
      return { success: true };
    }),

  // 查询链上分红合约统计数据（通过累加历史月份分红池计算累计分红）
  getContractStats: adminProcedure.query(async () => {
    const contractAddr = ENV.revenueDistributorAddress;
    if (!contractAddr || !ENV.blockchainRpcUrl) {
      return {
        totalDistributed: "0",
        contractAddress: contractAddr || null,
        available: false,
      };
    }

    try {
      const provider = new ethers.JsonRpcProvider(ENV.blockchainRpcUrl);
      const contract = new ethers.Contract(contractAddr, RevenueDistributorABI, provider);

      // 获取最近分红月份（格式 YYYYMM）
      const lastMonthRaw: bigint = await contract.lastDistributionMonth();
      const lastMonth = Number(lastMonthRaw);

      if (lastMonth === 0) {
        return {
          totalDistributed: "0",
          contractAddress: contractAddr,
          available: true,
        };
      }

      // 遍历从 202601 到 lastMonth 的所有月份，累加分红池
      const startYear = 2026, startMonthNum = 1;
      const lastYear = Math.floor(lastMonth / 100);
      const lastMonthNum = lastMonth % 100;
      const months: number[] = [];
      let y = startYear, m = startMonthNum;
      while (y < lastYear || (y === lastYear && m <= lastMonthNum)) {
        months.push(y * 100 + m);
        m++; if (m > 12) { m = 1; y++; }
      }

      const poolResults = await Promise.all(
        months.map((month) => contract.getMonthlyRevenuePool(month).catch(() => BigInt(0)))
      );
      const totalWei = poolResults.reduce((acc, v) => acc + v, BigInt(0));

      return {
        totalDistributed: ethers.formatUnits(totalWei, 6),
        contractAddress: contractAddr,
        available: true,
      };
    } catch (err) {
      console.error("[AdminRevenue] Failed to query contract:", err);
      return {
        totalDistributed: "0",
        contractAddress: contractAddr,
        available: false,
        error: (err as Error).message,
      };
    }
  }),

  // 查询质押统计数据（链上）
  getStakingStats: adminProcedure.query(async () => {
    const stakingAddr = ENV.stakingManagerAddress;
    if (!stakingAddr || !ENV.blockchainRpcUrl) {
      return {
        totalStaked: "0",
        totalStakers: 0,
        contractAddress: stakingAddr || null,
        available: false,
      };
    }

    try {
      const provider = new ethers.JsonRpcProvider(ENV.blockchainRpcUrl);
      const contract = new ethers.Contract(stakingAddr, StakingManagerABI, provider);

      // 动态查询 C2-Coin 精度（实际是 6 位，不能硬编码 18）
      let c2Decimals = 18;
      if (ENV.c2CoinAddress) {
        try {
          const c2Token = new ethers.Contract(ENV.c2CoinAddress, ERC20_MINIMAL_ABI, provider);
          c2Decimals = Number(await c2Token.decimals());
        } catch { /* 使用默认值 */ }
      }

      // 使用合约实际存在的函数名 getTotalStaked()
      const totalStakedRaw = await contract.getTotalStaked().catch(() => BigInt(0));

      // 质押人数从数据库 transactions 表统计（合约无此函数）
      const { getDb } = await import("../db");
      const { transactions } = await import("../../drizzle/schema");
      const { countDistinct, eq: eqOp } = await import("drizzle-orm");
      const db = await getDb();
      let totalStakers = 0;
      if (db) {
        const result = await db
          .select({ count: countDistinct(transactions.walletAddress) })
          .from(transactions)
          .where(eqOp(transactions.txType, "stake"));
        totalStakers = Number(result[0]?.count ?? 0);
      }

      return {
        totalStaked: ethers.formatUnits(totalStakedRaw, c2Decimals),
        totalStakers,
        contractAddress: stakingAddr,
        available: true,
      };
    } catch (err) {
      console.error("[AdminRevenue] Failed to query staking contract:", err);
      return {
        totalStaked: "0",
        totalStakers: 0,
        contractAddress: stakingAddr,
        available: false,
        error: (err as Error).message,
      };
    }
  }),

  // 查询质押交易历史（数据库）
  getStakingHistory: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
      }).optional()
    )
    .query(async ({ input }) => {
      const { getDb } = await import("../db");
      const { transactions } = await import("../../drizzle/schema");
      const { inArray, desc: descOp } = await import("drizzle-orm");

      const db = await getDb();
      if (!db) return { transactions: [] };

      const rows = await db
        .select()
        .from(transactions)
        .where(inArray(transactions.txType, ["stake", "unstake", "claim_reward"]))
        .orderBy(descOp(transactions.createdAt))
        .limit(input?.limit ?? 50);

      return { transactions: rows };
    }),

  // ─── 链上操作记录查询 ─────────────────────────────────────────────────────

  // 查询管理员链上操作历史
  getAdminTxHistory: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }).optional())
    .query(async ({ input }) => {
      const records = await listAdminTransactions(input?.limit ?? 20);
      return { records };
    }),

  // ─── 一键触发链上分红 ─────────────────────────────────────────────────────

  /**
   * 使用部署者私钥调用 RevenueDistributor.distributeRevenue(amount)
   * amount 为 USDT 数量（6 位小数）
   */
  triggerDistributeRevenue: adminProcedure
    .input(
      z.object({
        amount: z.string().regex(/^\d+(\.\d+)?$/, "请输入有效的 USDT 金额"),
        note: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const contractAddr = ENV.revenueDistributorAddress;
      const privateKey = ENV.deployerPrivateKey;
      const rpcUrl = ENV.blockchainRpcUrl;

      if (!contractAddr || !privateKey || !rpcUrl) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "合约地址或部署者私钥未配置，请检查环境变量",
        });
      }

      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const signer = new ethers.Wallet(privateKey, provider);
        const contract = new ethers.Contract(contractAddr, RevenueDistributorABI, signer);

        // amount 转为 USDT 最小单位（6 位小数）
        const amountWei = ethers.parseUnits(input.amount, 6);

        console.log(`[AdminRevenue] Triggering startDistribution: amount=${input.amount} USDT`);
        const tx = await contract.startDistribution(amountWei);

        // 先记录为 pending 状态
        await recordAdminTransaction({
          txType: "distribute_revenue",
          txHash: tx.hash,
          amount: input.amount,
          status: "pending",
          note: input.note ?? `发放分红 ${input.amount} USDT`,
          createdBy: ctx.user.openId,
        });

        // 等待确认（最多等 2 个区块）
        const receipt = await tx.wait(2);

        // 更新为 confirmed
        await updateAdminTransactionStatus(
          tx.hash,
          "confirmed",
          receipt?.blockNumber ?? undefined,
        );

        // 推送 notifyOwner 通知
        await notifyOwner({
          title: "✅ 链上分红已发放",
          content: [
            `金额：${input.amount} USDT`,
            `交易哈希：${tx.hash}`,
            `区块：${receipt?.blockNumber ?? "待确认"}`,
            `操作人：${ctx.user.openId}`,
            `时间：${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`,
            input.note ? `备注：${input.note}` : "",
          ].filter(Boolean).join("\n"),
        }).catch((e) => console.warn("[AdminRevenue] notifyOwner failed:", e));

        return {
          success: true,
          txHash: tx.hash,
          blockNumber: receipt?.blockNumber ?? null,
          amount: input.amount,
        };
      } catch (err: unknown) {
        const errMsg = (err as Error).message ?? "未知错误";
        console.error("[AdminRevenue] distributeRevenue failed:", errMsg);

        // 如果已有 txHash，更新为 failed
        if (typeof err === "object" && err !== null && "transaction" in err) {
          const txErr = err as { transaction?: { hash?: string } };
          if (txErr.transaction?.hash) {
            await updateAdminTransactionStatus(
              txErr.transaction.hash,
              "failed",
              undefined,
              errMsg,
            ).catch(() => {});
          }
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `链上分红失败: ${errMsg}`,
        });
      }
    }),

  // ─── 一键发放质押奖励 ─────────────────────────────────────────────────────

  /**
   * 使用部署者私钥调用 StakingManager.distributeRewards(amount)
   * amount 为 C2-Coin 数量（18 位小数）
   */
  triggerDistributeStakingReward: adminProcedure
    .input(
      z.object({
        amount: z.string().regex(/^\d+(\.\d+)?$/, "请输入有效的 C2-Coin 数量"),
        note: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const contractAddr = ENV.stakingManagerAddress;
      const privateKey = ENV.deployerPrivateKey;
      const rpcUrl = ENV.blockchainRpcUrl;

      if (!contractAddr || !privateKey || !rpcUrl) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "质押合约地址或部署者私钥未配置，请检查环境变量",
        });
      }

      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const signer = new ethers.Wallet(privateKey, provider);
        const contract = new ethers.Contract(contractAddr, StakingManagerABI, signer);

        // amount 转为 C2-Coin 最小单位（18 位小数）
        const amountWei = ethers.parseUnits(input.amount, 18);

        console.log(`[AdminRevenue] Triggering startMonthlyReward: amount=${input.amount} C2`);
        const tx = await contract.startMonthlyReward(amountWei);

        // 先记录为 pending 状态
        await recordAdminTransaction({
          txType: "distribute_staking_reward",
          txHash: tx.hash,
          amount: input.amount,
          status: "pending",
          note: input.note ?? `发放质押奖励 ${input.amount} C2`,
          createdBy: ctx.user.openId,
        });

        // 等待确认（最多等 2 个区块）
        const receipt = await tx.wait(2);

        // 更新为 confirmed
        await updateAdminTransactionStatus(
          tx.hash,
          "confirmed",
          receipt?.blockNumber ?? undefined,
        );

        // 推送 notifyOwner 通知
        await notifyOwner({
          title: "✅ 质押奖励已发放",
          content: [
            `金额：${input.amount} C2-Coin`,
            `交易哈希：${tx.hash}`,
            `区块：${receipt?.blockNumber ?? "待确认"}`,
            `操作人：${ctx.user.openId}`,
            `时间：${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`,
            input.note ? `备注：${input.note}` : "",
          ].filter(Boolean).join("\n"),
        }).catch((e) => console.warn("[AdminRevenue] notifyOwner failed:", e));

        return {
          success: true,
          txHash: tx.hash,
          blockNumber: receipt?.blockNumber ?? null,
          amount: input.amount,
        };
      } catch (err: unknown) {
        const errMsg = (err as Error).message ?? "未知错误";
        console.error("[AdminRevenue] distributeRewards failed:", errMsg);

        if (typeof err === "object" && err !== null && "transaction" in err) {
          const txErr = err as { transaction?: { hash?: string } };
          if (txErr.transaction?.hash) {
            await updateAdminTransactionStatus(
              txErr.transaction.hash,
              "failed",
              undefined,
              errMsg,
            ).catch(() => {});
          }
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `发放质押奖励失败: ${errMsg}`,
        });
      }
    }),
});
