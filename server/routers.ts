import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { whitelistRouter } from "./routers/whitelist";
import { dashboardRouter } from "./routers/dashboard";
import { siweAuthRouter } from "./routers/siweAuth";
import { purchaseRouter } from "./routers/purchase";

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
});

export type AppRouter = typeof appRouter;
