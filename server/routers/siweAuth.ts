import { z } from "zod";
import { SiweMessage } from "siwe";
import { v4 as uuidv4 } from "uuid";
import { SignJWT, jwtVerify } from "jose";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// 内存存储 nonce（生产环境建议用 Redis 或数据库）
const nonceStore = new Map<string, { nonce: string; expiresAt: number }>();

// 清理过期 nonce
function cleanExpiredNonces() {
  const now = Date.now();
  const keysToDelete: string[] = [];
  nonceStore.forEach((value, key) => {
    if (value.expiresAt < now) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => nonceStore.delete(key));
}

// 获取 JWT 密钥
function getJwtSecret() {
  const secret = process.env.JWT_SECRET || "pect-dapp-default-secret-change-in-production";
  return new TextEncoder().encode(secret);
}

export const siweAuthRouter = router({
  // 生成 nonce（前端请求签名前先获取）
  getNonce: publicProcedure
    .input(z.object({ address: z.string() }))
    .mutation(async ({ input }) => {
      cleanExpiredNonces();
      const nonce = uuidv4().replace(/-/g, "");
      const sessionKey = input.address.toLowerCase();
      nonceStore.set(sessionKey, {
        nonce,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 分钟有效期
      });
      return { nonce };
    }),

  // 验证签名并签发 JWT
  verify: publicProcedure
    .input(
      z.object({
        message: z.string(),
        signature: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // 解析 SIWE 消息
        const siweMessage = new SiweMessage(input.message);
        const address = siweMessage.address.toLowerCase();

        // 检查 nonce 是否有效
        const stored = nonceStore.get(address);
        if (!stored || stored.expiresAt < Date.now()) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Nonce 已过期，请重新获取",
          });
        }
        if (stored.nonce !== siweMessage.nonce) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Nonce 不匹配，请重新签名",
          });
        }

        // 验证签名
        const result = await siweMessage.verify({
          signature: input.signature,
          domain: siweMessage.domain,
          nonce: siweMessage.nonce,
          time: siweMessage.issuedAt,
        });
        if (!result.success) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: `签名验证失败: ${result.error?.type || '未知错误'}`,
          });
        }

        // 清除已使用的 nonce
        nonceStore.delete(address);

        // 查找或创建用户
        const db = await getDb();
        let userId: number;
        let userName: string | null = null;

        if (db) {
          const existing = await db
            .select()
            .from(users)
            .where(eq(users.openId, address))
            .limit(1);

          if (existing.length > 0) {
            userId = existing[0].id;
            userName = existing[0].name;
            // 更新最后登录时间
            await db
              .update(users)
              .set({ lastSignedIn: new Date() })
              .where(eq(users.openId, address));
          } else {
            // 新用户注册
            const insertResult = await db.insert(users).values({
              openId: address,
              name: `${address.slice(0, 6)}...${address.slice(-4)}`,
              loginMethod: "siwe",
              lastSignedIn: new Date(),
            });
            userId = (insertResult as any)[0]?.insertId || 0;
            userName = `${address.slice(0, 6)}...${address.slice(-4)}`;
          }
        } else {
          // 无数据库时使用地址作为 ID
          userId = 0;
          userName = `${address.slice(0, 6)}...${address.slice(-4)}`;
        }

        // 签发 JWT
        const token = await new SignJWT({
          address,
          userId,
          name: userName,
        })
          .setProtectedHeader({ alg: "HS256" })
          .setIssuedAt()
          .setExpirationTime("7d")
          .sign(getJwtSecret());

        // 设置 Cookie
        const isProduction = process.env.NODE_ENV === "production";
        ctx.res.cookie("siwe_token", token, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
          path: "/",
        });

        return {
          success: true,
          address,
          name: userName,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "登录失败，请重试",
        });
      }
    }),

  // 获取当前登录用户信息
  me: publicProcedure.query(async ({ ctx }) => {
    const token = ctx.req.cookies?.siwe_token;
    if (!token) return null;

    try {
      const { payload } = await jwtVerify(token, getJwtSecret());
      return {
        address: payload.address as string,
        name: payload.name as string,
        userId: payload.userId as number,
      };
    } catch {
      return null;
    }
  }),

  // 登出
  logout: publicProcedure.mutation(({ ctx }) => {
    ctx.res.clearCookie("siwe_token", {
      httpOnly: true,
      path: "/",
    });
    return { success: true };
  }),
});
