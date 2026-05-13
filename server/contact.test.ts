import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./_core/context";

// ── Mock 数据库和邮件服务 ──────────────────────────────────────────────────
vi.mock("./db", () => ({
  insertContactMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./email", () => ({
  sendContactNotificationEmail: vi.fn().mockResolvedValue(true),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

import { appRouter } from "./routers";
import { insertContactMessage } from "./db";
import { sendContactNotificationEmail } from "./email";
import { notifyOwner } from "./_core/notification";

// ── 工具函数 ──────────────────────────────────────────────────────────────
function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

const validInput = {
  name: "张三",
  email: "zhangsan@example.com",
  subject: "关于 PVC 购买的问题",
  message: "您好，我想了解一下私募轮的购买流程，请问需要哪些材料？",
};

// ── 测试套件 ──────────────────────────────────────────────────────────────
describe("contact.submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("成功提交留言并返回 { success: true }", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.contact.submit(validInput);

    expect(result).toEqual({ success: true });
  });

  it("成功提交后调用 insertContactMessage 存入数据库", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await caller.contact.submit(validInput);

    expect(insertContactMessage).toHaveBeenCalledOnce();
    expect(insertContactMessage).toHaveBeenCalledWith(validInput);
  });

  it("成功提交后触发邮件通知（不阻塞）", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await caller.contact.submit(validInput);

    // 等待异步通知完成
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(sendContactNotificationEmail).toHaveBeenCalledOnce();
    expect(sendContactNotificationEmail).toHaveBeenCalledWith(validInput);
  });

  it("成功提交后触发 Manus 站内通知（不阻塞）", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await caller.contact.submit(validInput);

    // 等待异步通知完成
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(notifyOwner).toHaveBeenCalledOnce();
    const notifyCall = vi.mocked(notifyOwner).mock.calls[0]![0];
    expect(notifyCall.title).toContain(validInput.subject);
    expect(notifyCall.content).toContain(validInput.name);
    expect(notifyCall.content).toContain(validInput.email);
    expect(notifyCall.content).toContain(validInput.message);
  });

  it("未登录用户也可以提交留言（publicProcedure）", async () => {
    const ctx = createPublicContext();
    expect(ctx.user).toBeNull();

    const caller = appRouter.createCaller(ctx);
    const result = await caller.contact.submit(validInput);

    expect(result).toEqual({ success: true });
  });

  // ── 输入校验测试 ──────────────────────────────────────────────────────
  it("姓名为空时抛出 BAD_REQUEST 错误", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.contact.submit({ ...validInput, name: "" })
    ).rejects.toThrow();
  });

  it("邮箱格式无效时抛出 BAD_REQUEST 错误", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.contact.submit({ ...validInput, email: "not-an-email" })
    ).rejects.toThrow();
  });

  it("主题为空时抛出 BAD_REQUEST 错误", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.contact.submit({ ...validInput, subject: "" })
    ).rejects.toThrow();
  });

  it("消息内容为空时抛出 BAD_REQUEST 错误", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.contact.submit({ ...validInput, message: "" })
    ).rejects.toThrow();
  });

  it("消息内容超过 5000 字符时抛出 BAD_REQUEST 错误", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.contact.submit({ ...validInput, message: "a".repeat(5001) })
    ).rejects.toThrow();
  });

  it("数据库写入失败时抛出错误", async () => {
    vi.mocked(insertContactMessage).mockRejectedValueOnce(
      new Error("Database connection failed")
    );

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.contact.submit(validInput)).rejects.toThrow(
      "Database connection failed"
    );
  });

  it("邮件发送失败不影响接口返回成功", async () => {
    vi.mocked(sendContactNotificationEmail).mockRejectedValueOnce(
      new Error("Email service unavailable")
    );

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // 即使邮件失败，接口仍应返回成功
    const result = await caller.contact.submit(validInput);
    expect(result).toEqual({ success: true });
  });

  it("站内通知失败不影响接口返回成功", async () => {
    vi.mocked(notifyOwner).mockRejectedValueOnce(
      new Error("Notification service unavailable")
    );

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.contact.submit(validInput);
    expect(result).toEqual({ success: true });
  });
});
