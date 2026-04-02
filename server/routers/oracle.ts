/**
 * Oracle 数据路由
 * 提供首页展示用的汇总数据：累计发电量、电费收入、分红池、最新汇率
 * 数据来源：revenue_records 表（由管理员录入）
 */
import { publicProcedure, router } from "../_core/trpc";
import { getRevenueStats, listRevenueRecords } from "../db";

export const oracleRouter = router({
  /**
   * 获取汇总统计数据（用于首页 Oracle 数据卡片）
   * 累计所有期数的发电量、电费收入、分红池，以及最新汇率
   */
  getStats: publicProcedure.query(async () => {
    const stats = await getRevenueStats();
    return {
      totalGeneration: stats.totalGeneration,       // kWh 累计
      totalRevenue: stats.totalRevenue,             // RMB 累计
      totalDividendPool: stats.totalDividendPool,   // USDT 累计
      latestExchangeRate: stats.latestExchangeRate, // RMB/USDT
      recordCount: stats.recordCount,               // 已录入期数
    };
  }),

  /**
   * 获取最近 12 期分红记录（用于首页历史数据展示）
   */
  getRecentRecords: publicProcedure.query(async () => {
    const records = await listRevenueRecords(12);
    return records.map(r => ({
      id: r.id,
      periodLabel: r.periodLabel,
      periodYear: r.periodYear,
      periodMonth: r.periodMonth,
      totalGeneration: r.totalGeneration,
      totalRevenue: r.totalRevenue,
      dividendPool: r.dividendPool,
      exchangeRate: r.exchangeRate,
      txHash: r.txHash,
      createdAt: r.createdAt,
    }));
  }),
});
