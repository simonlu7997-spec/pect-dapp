import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { whitelistRouter } from "./routers/whitelist";
import { dashboardRouter } from "./routers/dashboard";
import { siweAuthRouter } from "./routers/siweAuth";
import { purchaseRouter } from "./routers/purchase";
import { revenueRouter } from "./routers/revenue";
import { stakingRouter } from "./routers/staking";
import { adminRevenueRouter } from "./routers/adminRevenue";
import { oracleRouter } from "./routers/oracle";
import { adminStationsRouter } from "./routers/adminStations";
import { stationsPublicRouter } from "./routers/stationsPublic";
import { airdropRouter } from "./routers/airdrop";
import { adminAirdropRouter } from "./routers/adminAirdrop";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // SIWE 钱包签名认证路由
  siweAuth: siweAuthRouter,
  // 白名单路由（后端使用部署者私钥调用合约）
  whitelist: whitelistRouter,
  // 用户仪表盘：交易记录、钱包绑定
  dashboard: dashboardRouter,
  // 代币购买：私募/公募轮信息查询、交易记录
  purchase: purchaseRouter,
  // PV-Coin 分红查询和领取
  revenue: revenueRouter,
  // C2-Coin 质押管理
  staking: stakingRouter,
  // 管理后台：分红数据管理 + 质押统计
  adminRevenue: adminRevenueRouter,
  // 首页 Oracle 数据（发电量、收入、分红池汇总）
  oracle: oracleRouter,
  // 电站管理（管理员端）
  adminStations: adminStationsRouter,
  // 电站公开查询（首页使用）
  stations: stationsPublicRouter,
  // C2-Coin 空投查询和领取
  airdrop: airdropRouter,
  // 管理后台：空投手动触发和历史查询
  adminAirdrop: adminAirdropRouter,
});

export type AppRouter = typeof appRouter;
