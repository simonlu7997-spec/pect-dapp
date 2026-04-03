import { eq, desc, asc, inArray, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import type { MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import {
  InsertUser,
  users,
  kycApplications,
  InsertKycApplication,
  transactions,
  InsertTransaction,
  walletBindings,
  InsertWalletBinding,
  revenueRecords,
  InsertRevenueRecord,
  type RevenueRecord,
  stations,
  InsertStation,
  type Station,
  adminTransactions,
  InsertAdminTransaction,
  type AdminTransaction,
} from "../drizzle/schema";
import { ENV } from './_core/env';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _db: MySql2Database<any> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      const pool = mysql.createPool({
        host: url.hostname,
        port: parseInt(url.port) || 4000,
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        database: url.pathname.slice(1),
        ssl: { rejectUnauthorized: false },
        waitForConnections: true,
        connectionLimit: 10,
      });
      _db = drizzle(pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const now = new Date();
    const values: InsertUser = {
      openId: user.openId,
      name: user.name ?? null,
      email: user.email ?? null,
      loginMethod: user.loginMethod ?? null,
      role: user.role ?? (user.openId === ENV.ownerOpenId ? 'admin' : 'user'),
      lastSignedIn: user.lastSignedIn ?? now,
      updatedAt: now,
    };

    await db
      .insert(users)
      .values(values)
      .onDuplicateKeyUpdate({
        set: {
          name: values.name,
          email: values.email,
          loginMethod: values.loginMethod,
          lastSignedIn: values.lastSignedIn,
          updatedAt: now,
        },
      });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ---- KYC Applications ----

export async function createKycApplication(data: InsertKycApplication) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(kycApplications).values(data);
}

export async function getKycByWallet(walletAddress: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(kycApplications)
    .where(eq(kycApplications.walletAddress, walletAddress.toLowerCase()))
    .orderBy(desc(kycApplications.createdAt))
    .limit(1);
  return result[0] ?? undefined;
}

export async function updateKycStatus(
  id: number,
  status: "pending" | "approved" | "rejected",
  opts?: { txHashKyc?: string; txHashSender?: string; reviewNote?: string }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(kycApplications)
    .set({ status, updatedAt: new Date(), ...opts })
    .where(eq(kycApplications.id, id));
}

export async function getKycById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(kycApplications)
    .where(eq(kycApplications.id, id))
    .limit(1);
  return result[0] ?? undefined;
}

export async function listKycApplications(status?: "pending" | "approved" | "rejected") {
  const db = await getDb();
  if (!db) return [];
  if (status) {
    return db
      .select()
      .from(kycApplications)
      .where(eq(kycApplications.status, status))
      .orderBy(desc(kycApplications.createdAt));
  }
  return db.select().from(kycApplications).orderBy(desc(kycApplications.createdAt));
}

// ---- Transactions ----

export async function recordTransaction(data: InsertTransaction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(transactions).values(data);
}

export async function getTransactionsByWallet(walletAddress: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(transactions)
    .where(eq(transactions.walletAddress, walletAddress.toLowerCase()))
    .orderBy(desc(transactions.createdAt))
    .limit(50);
}

export async function listPendingTransactions() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(transactions)
    .where(eq(transactions.status, "pending"))
    .orderBy(transactions.createdAt)
    .limit(100);
}

export async function updateTransactionStatus(
  txHash: string,
  status: "pending" | "confirmed" | "failed",
  opts?: { blockNumber?: number; gasUsed?: string; errorMessage?: string; confirmedAt?: Date }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(transactions)
    .set({ status, ...opts })
    .where(eq(transactions.txHash, txHash));
}

// ---- Revenue Records ----

export async function createRevenueRecord(data: InsertRevenueRecord) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(revenueRecords).values(data);
}

export async function listRevenueRecords(limit = 24): Promise<RevenueRecord[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(revenueRecords)
    .orderBy(desc(revenueRecords.periodYear), desc(revenueRecords.periodMonth))
    .limit(limit);
}

export async function getRevenueRecordByPeriod(year: number, month: number): Promise<RevenueRecord | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(revenueRecords)
    .where(eq(revenueRecords.periodYear, year))
    .limit(12);
  return result.find(r => r.periodMonth === month);
}

export async function deleteRevenueRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(revenueRecords).where(eq(revenueRecords.id, id));
}

export async function getLatestRevenueRecord(): Promise<RevenueRecord | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(revenueRecords)
    .orderBy(desc(revenueRecords.periodYear), desc(revenueRecords.periodMonth))
    .limit(1);
  return result[0] ?? undefined;
}

export async function getRevenueStats() {
  const db = await getDb();
  if (!db) return { totalGeneration: "0", totalRevenue: "0", totalDividendPool: "0", latestExchangeRate: "7.2", recordCount: 0 };
  const records = await db.select().from(revenueRecords);
  const totalGeneration = records.reduce((sum, r) => sum + parseFloat(r.totalGeneration), 0);
  const totalRevenue = records.reduce((sum, r) => sum + parseFloat(r.totalRevenue), 0);
  const totalDividendPool = records.reduce((sum, r) => sum + parseFloat(r.dividendPool), 0);
  const latest = records.sort((a, b) => b.periodYear - a.periodYear || b.periodMonth - a.periodMonth)[0];
  return {
    totalGeneration: totalGeneration.toFixed(0),
    totalRevenue: totalRevenue.toFixed(0),
    totalDividendPool: totalDividendPool.toFixed(0),
    latestExchangeRate: latest?.exchangeRate ?? "7.2",
    recordCount: records.length,
  };
}

// ---- Wallet Bindings ----

export async function bindWallet(data: InsertWalletBinding) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .insert(walletBindings)
    .values(data)
    .onDuplicateKeyUpdate({
      set: { userId: data.userId },
    });
}

export async function getWalletsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(walletBindings)
    .where(eq(walletBindings.userId, userId))
    .orderBy(desc(walletBindings.createdAt));
}

// ─── Stations ────────────────────────────────────────────────────────────────

export async function listStations(activeOnly = false): Promise<Station[]> {
  const db = await getDb();
  if (!db) return [];
  if (activeOnly) {
    return db.select().from(stations).where(eq(stations.isActive, true)).orderBy(asc(stations.sortOrder), asc(stations.id));
  }
  return db.select().from(stations).orderBy(asc(stations.sortOrder), asc(stations.id));
}

export async function createStation(data: InsertStation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(stations).values(data);
}

export async function updateStation(id: number, data: Partial<InsertStation>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(stations).set({ ...data, updatedAt: new Date() }).where(eq(stations.id, id));
}

export async function deleteStation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(stations).where(eq(stations.id, id));
}

// ─── AdminTransactions ───────────────────────────────────────────────────────

export async function recordAdminTransaction(data: InsertAdminTransaction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(adminTransactions).values(data);
}

export async function listAdminTransactions(limit = 50): Promise<AdminTransaction[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(adminTransactions).orderBy(desc(adminTransactions.createdAt)).limit(limit);
}

export async function updateAdminTransactionStatus(
  txHash: string,
  status: "confirmed" | "failed",
  blockNumber?: number,
  errorMessage?: string
) {
  const db = await getDb();
  if (!db) return;
  await db.update(adminTransactions)
    .set({
      status,
      blockNumber: blockNumber ?? null,
      errorMessage: errorMessage ?? null,
      confirmedAt: status === "confirmed" ? new Date() : null,
    })
    .where(eq(adminTransactions.txHash, txHash));
}

/**
 * 获取所有已确认 PVC 购买交易的钉包地址（用于月度空投计算）
 */
export async function getPvcHolderAddresses(): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .selectDistinct({ walletAddress: transactions.walletAddress })
    .from(transactions)
    .where(
      and(
        inArray(transactions.txType, ["purchase_private", "purchase_public"]),
        eq(transactions.status, "confirmed")
      )
    );
  return rows.map((r) => r.walletAddress);
}
