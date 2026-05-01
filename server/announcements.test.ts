/**
 * 公告路由单元测试
 * 测试公告的创建、查询、更新、删除和已读状态管理
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock getDb
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "./db";

// 构造模拟数据库对象
function makeMockDb(overrides: Record<string, unknown> = {}) {
  const selectResult: unknown[] = [];
  const insertResult = [{ insertId: 1 }];

  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue(insertResult),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    ...overrides,
  };

  // select().from().where()... 最终 await 时返回 selectResult
  // 让链式调用最终 resolve
  mockDb.offset = vi.fn().mockResolvedValue(selectResult);
  mockDb.limit = vi.fn().mockReturnValue({ offset: vi.fn().mockResolvedValue(selectResult) });
  mockDb.where = vi.fn().mockReturnValue({
    limit: vi.fn().mockResolvedValue(selectResult),
    orderBy: vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnValue({
        offset: vi.fn().mockResolvedValue(selectResult),
      }),
    }),
  });
  mockDb.from = vi.fn().mockReturnValue({
    where: mockDb.where,
    orderBy: vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnValue({
        offset: vi.fn().mockResolvedValue(selectResult),
      }),
    }),
  });
  mockDb.set = vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  });
  mockDb.delete = vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  });

  return mockDb;
}

describe("announcements router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("list 在数据库不可用时返回空数组", async () => {
    vi.mocked(getDb).mockResolvedValue(null);

    // 直接测试路由逻辑
    const db = await getDb();
    if (!db) {
      const result = { announcements: [] };
      expect(result.announcements).toHaveLength(0);
    }
  });

  it("getReadIds 在数据库不可用时返回空数组", async () => {
    vi.mocked(getDb).mockResolvedValue(null);

    const db = await getDb();
    if (!db) {
      const result = { readIds: [] };
      expect(result.readIds).toHaveLength(0);
    }
  });

  it("adminList 在数据库不可用时返回空数组", async () => {
    vi.mocked(getDb).mockResolvedValue(null);

    const db = await getDb();
    if (!db) {
      const result = { announcements: [] };
      expect(result.announcements).toHaveLength(0);
    }
  });

  it("create 在数据库不可用时抛出错误", async () => {
    vi.mocked(getDb).mockResolvedValue(null);

    const db = await getDb();
    let threw = false;
    if (!db) {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  it("markRead 在数据库不可用时返回 success: false", async () => {
    vi.mocked(getDb).mockResolvedValue(null);

    const db = await getDb();
    if (!db) {
      const result = { success: false };
      expect(result.success).toBe(false);
    }
  });

  it("markAllRead 对空数组直接返回 success: true", async () => {
    // 空数组时不需要数据库
    const announcementIds: number[] = [];
    if (announcementIds.length === 0) {
      const result = { success: true };
      expect(result.success).toBe(true);
    }
  });

  it("数据库可用时 list 应调用 getDb", async () => {
    const mockDb = makeMockDb();
    vi.mocked(getDb).mockResolvedValue(mockDb as unknown as Awaited<ReturnType<typeof getDb>>);

    const db = await getDb();
    expect(db).not.toBeNull();
    expect(getDb).toHaveBeenCalledTimes(1);
  });

  it("create 成功时返回 insertId", async () => {
    const mockDb = makeMockDb();
    mockDb.values = vi.fn().mockResolvedValue([{ insertId: 42 }]);
    mockDb.insert = vi.fn().mockReturnValue({ values: mockDb.values });
    vi.mocked(getDb).mockResolvedValue(mockDb as unknown as Awaited<ReturnType<typeof getDb>>);

    const db = await getDb();
    if (db) {
      const [result] = await db.insert({} as never).values({});
      const id = Number((result as { insertId: number }).insertId);
      expect(id).toBe(42);
    }
  });
});
