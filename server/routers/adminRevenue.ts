import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createRevenueRecord,
  listRevenueRecords,
  getRevenueRecordByPeriod,
  deleteRevenueRecord,
} from "../db";
import { ethers } from "ethers";
import { ENV } from "../_core/env";

// RevenueDistributor 合约 ABI（管理员相关函数）
const RevenueDistributorABI = [
  "function distributeRevenue(uint256 amount) external",
  "function totalDistributed() external view returns (uint256)",
  "function getClaimableAmount(address user) external view returns (uint256)",
  "function totalStakers() external view returns (uint256)",
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

  // 查询链上分红合约统计数据
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
      const totalDistributed = await contract.totalDistributed();
      return {
        totalDistributed: ethers.formatUnits(totalDistributed, 6),
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

    const StakingManagerABI = [
      "function totalStaked() external view returns (uint256)",
      "function stakerCount() external view returns (uint256)",
    ];

    try {
      const provider = new ethers.JsonRpcProvider(ENV.blockchainRpcUrl);
      const contract = new ethers.Contract(stakingAddr, StakingManagerABI, provider);
      const [totalStaked, stakerCount] = await Promise.all([
        contract.totalStaked().catch(() => BigInt(0)),
        contract.stakerCount().catch(() => BigInt(0)),
      ]);
      return {
        totalStaked: ethers.formatUnits(totalStaked, 18),
        totalStakers: Number(stakerCount),
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
});
