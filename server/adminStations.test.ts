import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database module
vi.mock("./db", () => ({
  getDb: vi.fn(),
  listStations: vi.fn(),
  createStation: vi.fn(),
  updateStation: vi.fn(),
  deleteStation: vi.fn(),
  listAdminTransactions: vi.fn(),
}));

import {
  listStations,
  createStation,
  updateStation,
  deleteStation,
} from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

const mockStation = {
  id: 1,
  name: "电站 A",
  capacity: "100",
  location: "浙江",
  annualGeneration: "45000",
  annualRevenue: "180000",
  status: "active" as const,
  description: null,
  imageUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("adminStations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("admin can list stations", async () => {
    vi.mocked(listStations).mockResolvedValue([mockStation]);
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.adminStations.list();
    expect(result.stations).toHaveLength(1);
    expect(result.stations[0]?.name).toBe("电站 A");
  });

  it("non-admin cannot list stations via adminStations", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.adminStations.list()).rejects.toThrow();
  });

  it("admin can create a station", async () => {
    vi.mocked(createStation).mockResolvedValue({ id: 2 });
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.adminStations.create({
      name: "电站 B",
      capacity: "150",
      location: "江苏",
      annualGeneration: "67500",
      annualRevenue: "270000",
      status: "active",
    });
    expect(result.success).toBe(true);
  });

  it("admin can update a station", async () => {
    vi.mocked(updateStation).mockResolvedValue(undefined);
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.adminStations.update({
      id: 1,
      name: "电站 A（更新）",
      capacity: "120",
      location: "浙江",
      annualGeneration: "54000",
      annualRevenue: "216000",
      status: "active",
    });
    expect(result.success).toBe(true);
  });

  it("admin can delete a station", async () => {
    vi.mocked(deleteStation).mockResolvedValue(undefined);
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.adminStations.delete({ id: 1 });
    expect(result.success).toBe(true);
  });
});
