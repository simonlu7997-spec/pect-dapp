import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { jwtVerify } from "jose";
import { getUserByOpenId } from "../db";

function getSiweJwtSecret() {
  const secret = process.env.JWT_SECRET || "pect-dapp-default-secret-change-in-production";
  return new TextEncoder().encode(secret);
}

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // 只使用 SIWE 钱包签名认证（已移除 Manus OAuth）
  try {
    const siweToken = opts.req.cookies?.siwe_token;
    if (siweToken) {
      const { payload } = await jwtVerify(siweToken, getSiweJwtSecret());
      const address = payload.address as string;
      if (address) {
        user = (await getUserByOpenId(address)) ?? null;
      }
    }
  } catch {
    // Token 无效或过期，user 保持 null
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
