import { z } from "zod";
import { SiweMessage } from "siwe";
import { v4 as uuidv4 } from "uuid";
import { SignJWT, jwtVerify } from "jose";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { users, siweNonces } from "../../drizzle/schema";
import { eq, lt, and } from "drizzle-orm";

// 获取 JWT 密钥
function getJwtSecret() {
  const secret = process.env.JWT_SECRET || "pect-dapp-default-secret-change-in-production";
  return new TextEncoder().encode(secret);
}

export const siweAuthRouter = router({
  // 生成 nonce（前端请求签名前先获取）
  getNonce: publicProcedure
    .input(z.object({ address: z.string() }))
    .mutation(async () => {
      const nonce = uuidv4().replace(/-/g, "");
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 分钟有效期

      const db = await getDb();
      if (db) {
        // 清理过期 nonce
        await db.delete(siweNonces).where(lt(siweNonces.expiresAt, new Date()));
        // 存储新 nonce 到数据库（持久化，解决 Vercel Serverless 无状态问题）
        await db.insert(siweNonces).values({
          address: "pending", // address 在 getNonce 时未知，用 nonce 本身作为 key
          nonce,
          expiresAt,
        });
      }

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
        console.log('[SIWE] Verify request received');

        // 解析 SIWE 消息
        const siweMessage = new SiweMessage(input.message);
        const address = siweMessage.address.toLowerCase();
        console.log('[SIWE] Parsed address:', address);
        console.log('[SIWE] Message nonce:', siweMessage.nonce);

        // 从数据库查找 nonce（不依赖内存，解决 Vercel Serverless 无状态问题）
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "数据库连接失败",
          });
        }

        const stored = await db
          .select()
          .from(siweNonces)
          .where(
            and(
              eq(siweNonces.nonce, siweMessage.nonce),
              // 只查未过期的
              // lt(new Date(), siweNonces.expiresAt) -- drizzle 语法不同，用 JS 过滤
            )
          )
          .limit(1);

        if (stored.length === 0 || stored[0].expiresAt < new Date()) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Nonce 已过期，请重新获取",
          });
        }

        // 验证签名
        console.log('[SIWE] Starting signature verification...');
        const result = await siweMessage.verify({
          signature: input.signature,
          domain: siweMessage.domain,
          nonce: siweMessage.nonce,
          time: siweMessage.issuedAt,
        });
        console.log('[SIWE] Verification result:', result.success);

        if (!result.success) {
          console.error('[SIWE] Verification failed:', result.error);
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: `签名验证失败: ${result.error?.type || '未知错误'}`,
          });
        }

        // 删除已使用的 nonce（防止重放攻击）
        await db.delete(siweNonces).where(eq(siweNonces.nonce, siweMessage.nonce));

        console.log('[SIWE] Signature verified successfully');

        // 查找或创建用户
        let userId: number;
        let userName: string | null = null;

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
          }).$returningId();
          userId = insertResult[0]?.id || 0;
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
        console.error('[SIWE] Error:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "登录失败，请重试",
        });
      }
    }),

  // 获取当前登录用户信息（含 role 字段，用于管理后台权限判断）
  me: publicProcedure.query(async ({ ctx }) => {
    const token = ctx.req.cookies?.siwe_token;
    if (!token) return null;

    try {
      const { payload } = await jwtVerify(token, getJwtSecret());
      const address = payload.address as string;
      const userId = payload.userId as number;
      const name = payload.name as string;

      // 从数据库查询完整用户信息（含 role 字段）
      const db = await getDb();
      if (db) {
        const userRecord = await db
          .select()
          .from(users)
          .where(eq(users.openId, address))
          .limit(1);
        if (userRecord.length > 0) {
          return {
            address,
            name: userRecord[0].name ?? name,
            userId,
            role: userRecord[0].role,
            email: userRecord[0].email,
          };
        }
      }

      // fallback：数据库不可用时返回基本信息
      return {
        address,
        name,
        userId,
        role: 'user' as const,
        email: null,
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
