import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
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

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    // Fallback: try SIWE wallet authentication via siwe_token cookie
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
      // SIWE auth also failed, user remains null
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
