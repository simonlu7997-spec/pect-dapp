import { z } from "zod";
import { getDb } from "../db";
import { calculatorParams } from "../../drizzle/schema";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

// 默认参数（与白皮书 V6.1 一致，汇率更新为 6.8）
export const DEFAULT_CALC_PARAMS = {
  exchangeRate: 6.8,
  electricityPrice: 1.109,
  annualDividendPool: 41155,       // PV-Coin 基础分红池（USDT）
  annualStakingPool: 4573,         // C2-Coin 年度质押奖励池（USDT）
  c2cAnnualAirdrop: 382990,        // C2-Coin 年度空投总量（枚）
  c2cStakingRate: 0.5,             // 全网 C2-Coin 质押率
  phase1TokenRatio: 0.75,
  phase2TokenRatio: 1.0,
  totalPvcSupply: 4000000,
};

export const calculatorParamsRouter = router({
  /**
   * 获取计算器参数（公开接口）
   */
  getParams: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return DEFAULT_CALC_PARAMS;
    const rows = await db.select().from(calculatorParams).limit(1);
    if (rows.length === 0) {
      return DEFAULT_CALC_PARAMS;
    }
    const row = rows[0];
    return {
      exchangeRate: parseFloat(row.exchangeRate),
      electricityPrice: parseFloat(row.electricityPrice),
      annualDividendPool: parseFloat(row.annualDividendPool),
      annualStakingPool: parseFloat(row.annualStakingPool),
      c2cAnnualAirdrop: parseFloat(row.c2cAnnualAirdrop),
      c2cStakingRate: parseFloat(row.c2cStakingRate),
      phase1TokenRatio: parseFloat(row.phase1TokenRatio),
      phase2TokenRatio: parseFloat(row.phase2TokenRatio),
      totalPvcSupply: row.totalPvcSupply,
    };
  }),

  /**
   * 更新计算器参数（管理员专用）
   */
  updateParams: protectedProcedure
    .input(
      z.object({
        exchangeRate: z.number().positive().max(100),
        electricityPrice: z.number().positive().max(100),
        annualDividendPool: z.number().positive(),
        annualStakingPool: z.number().min(0),
        c2cAnnualAirdrop: z.number().int().min(0),
        c2cStakingRate: z.number().min(0).max(1),
        phase1TokenRatio: z.number().min(0).max(1),
        phase2TokenRatio: z.number().min(0).max(1),
        totalPvcSupply: z.number().int().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "仅管理员可修改计算器参数" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
      const rows = await db.select().from(calculatorParams).limit(1);

      if (rows.length === 0) {
        await db.insert(calculatorParams).values({
          exchangeRate: input.exchangeRate.toString(),
          electricityPrice: input.electricityPrice.toString(),
          annualDividendPool: input.annualDividendPool.toString(),
          annualStakingPool: input.annualStakingPool.toString(),
          c2cAnnualAirdrop: input.c2cAnnualAirdrop.toString(),
          c2cStakingRate: input.c2cStakingRate.toString(),
          phase1TokenRatio: input.phase1TokenRatio.toString(),
          phase2TokenRatio: input.phase2TokenRatio.toString(),
          totalPvcSupply: input.totalPvcSupply,
          updatedBy: ctx.user.openId,
        });
      } else {
        await db
          .update(calculatorParams)
          .set({
            exchangeRate: input.exchangeRate.toString(),
            electricityPrice: input.electricityPrice.toString(),
            annualDividendPool: input.annualDividendPool.toString(),
            annualStakingPool: input.annualStakingPool.toString(),
            c2cAnnualAirdrop: input.c2cAnnualAirdrop.toString(),
            c2cStakingRate: input.c2cStakingRate.toString(),
            phase1TokenRatio: input.phase1TokenRatio.toString(),
            phase2TokenRatio: input.phase2TokenRatio.toString(),
            totalPvcSupply: input.totalPvcSupply,
            updatedAt: new Date(),
            updatedBy: ctx.user.openId,
          })
          .where(eq(calculatorParams.id, rows[0].id));
      }

      return { success: true };
    }),
});
