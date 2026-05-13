import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

// ── Mock 数据库和邮件服务 ──────────────────────────────────────────────────
vi.mock("./db", () => ({
  insertContactMessage: vi.fn().mockResolvedValue(undefined),
  getContactMessages: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  countContactMessagesByEmail: vi.fn().mockResolvedValue(0),
}));

vi.mock("./email", () => ({
  sendContactNotificationEmail: vi.fn().mockResolvedValue(true),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

import { appRouter } from "./routers";
import {
  insertContactMessage,
  getContactMessages,
  countContactMessagesByEmail,
} from "./db";
import { sendContactNotificationEmail } from "./email";
import { notifyOwner } from "./_core/notification";

// ── 工具函数 ──────────────────────────────────────────────────────────────
function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  const adminUser: User = {
    id: 1,
    openId: "0xadmin",
    email: "admin@pect.io",
    name: "Admin",
    loginMethod: "siwe",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user: adminUser,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const regularUser: User = {
    id: 2,
    openId: "0xuser",
    email: "user@example.com",
    name: "User",
    loginMethod: "siwe",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user: regularUser,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

const validInput = {
  name: "张三",
  email: "zhangsan@example.com",
  subject: "关于 PVC 购买的问题",
  message: "您好，我想了解一下私募轮的购买流程，请问需要哪些材料？",
};

// ── contact.submit 测试 ───────────────────────────────────────────────────
describe("contact.submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 默认：未达到限流阈值
    vi.mocked(countContactMessagesByEmail).mockResolvedValue(0);
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
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(sendContactNotificationEmail).toHaveBeenCalledOnce();
    expect(sendContactNotificationEmail).toHaveBeenCalledWith(validInput);
  });

  it("成功提交后触发 Manus 站内通知（不阻塞）", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await caller.contact.submit(validInput);
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
  it("姓名为空时抛出错误", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.contact.submit({ ...validInput, name: "" })).rejects.toThrow();
  });

  it("邮箱格式无效时抛出错误", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.contact.submit({ ...validInput, email: "not-an-email" })
    ).rejects.toThrow();
  });

  it("主题为空时抛出错误", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.contact.submit({ ...validInput, subject: "" })
    ).rejects.toThrow();
  });

  it("消息内容为空时抛出错误", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.contact.submit({ ...validInput, message: "" })
    ).rejects.toThrow();
  });

  it("消息内容超过 5000 字符时抛出错误", async () => {
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

  // ── 限流测试 ──────────────────────────────────────────────────────────
  it("同一邮箱 1 小时内提交次数未达上限时允许提交", async () => {
    vi.mocked(countContactMessagesByEmail).mockResolvedValue(2); // 已提交 2 次，上限 3
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.contact.submit(validInput);
    expect(result).toEqual({ success: true });
  });

  it("同一邮箱 1 小时内提交次数达到上限时抛出 TOO_MANY_REQUESTS 错误", async () => {
    vi.mocked(countContactMessagesByEmail).mockResolvedValue(3); // 已达上限 3 次
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.contact.submit(validInput)).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
  });

  it("达到限流时不调用 insertContactMessage", async () => {
    vi.mocked(countContactMessagesByEmail).mockResolvedValue(5); // 超过上限
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.contact.submit(validInput)).rejects.toThrow();
    expect(insertContactMessage).not.toHaveBeenCalled();
  });

  it("限流检查时传入正确的 email 和时间窗口", async () => {
    vi.mocked(countContactMessagesByEmail).mockResolvedValue(0);
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const beforeCall = Date.now();
    await caller.contact.submit(validInput);
    const afterCall = Date.now();

    expect(countContactMessagesByEmail).toHaveBeenCalledOnce();
    const [calledEmail, calledSince] = vi.mocked(countContactMessagesByEmail).mock.calls[0]!;
    expect(calledEmail).toBe(validInput.email);
    // since 应该在 1 小时前左右
    const sinceMs = calledSince.getTime();
    expect(sinceMs).toBeGreaterThan(beforeCall - 60 * 60 * 1000 - 1000);
    expect(sinceMs).toBeLessThan(afterCall - 60 * 60 * 1000 + 1000);
  });
});

// ── contact.list 测试 ─────────────────────────────────────────────────────
describe("contact.list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockMessages = [
    {
      id: 1,
      name: "李四",
      email: "lisi@example.com",
      subject: "投资咨询",
      message: "请问如何参与私募？",
      createdAt: new Date("2026-05-01T10:00:00Z"),
    },
    {
      id: 2,
      name: "王五",
      email: "wangwu@example.com",
      subject: "技术问题",
      message: "钱包连接失败怎么办？",
      createdAt: new Date("2026-05-02T10:00:00Z"),
    },
  ];

  it("管理员可以查询留言列表", async () => {
    vi.mocked(getContactMessages).mockResolvedValue({
      items: mockMessages as never,
      total: 2,
    });
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.contact.list({ page: 1, pageSize: 20 });
    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it("管理员查询时传入正确的分页参数", async () => {
    vi.mocked(getContactMessages).mockResolvedValue({ items: [], total: 0 });
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    await caller.contact.list({ page: 3, pageSize: 10 });
    expect(getContactMessages).toHaveBeenCalledWith({ page: 3, pageSize: 10 });
  });

  it("普通用户无权访问留言列表（FORBIDDEN）", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.contact.list({ page: 1, pageSize: 20 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("未登录用户无权访问留言列表（FORBIDDEN）", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.contact.list({ page: 1, pageSize: 20 })
    ).rejects.toThrow();
  });

  it("page 默认值为 1，pageSize 默认值为 20", async () => {
    vi.mocked(getContactMessages).mockResolvedValue({ items: [], total: 0 });
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    // 不传参数，使用默认值
    await caller.contact.list({});
    expect(getContactMessages).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
  });

  it("pageSize 超过 100 时抛出错误", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.contact.list({ page: 1, pageSize: 101 })
    ).rejects.toThrow();
  });
});
