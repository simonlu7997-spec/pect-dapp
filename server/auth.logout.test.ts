import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "0xabcdef1234567890abcdef1234567890abcdef12",
    email: null,
    name: "0xabcdef...ef12",
    loginMethod: "siwe",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears the siwe_token cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    // auth.logout 现在清除 siwe_token（已移除 Manus OAuth，不再使用 app_session_id）
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe("siwe_token");
    expect(clearedCookies[0]?.options).toMatchObject({
      httpOnly: true,
      path: "/",
    });
  });

  it("allows unauthenticated users to call logout without error", async () => {
    const clearedCookies: CookieCall[] = [];
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: (name: string, options: Record<string, unknown>) => {
          clearedCookies.push({ name, options });
        },
      } as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();

    // 即使未登录，logout 也应该成功（清除 cookie 是幂等操作）
    expect(result).toEqual({ success: true });
    expect(clearedCookies[0]?.name).toBe("siwe_token");
  });
});
