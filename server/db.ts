import { eq, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  InsertUser,
  users,
  kycApplications,
  InsertKycApplication,
  transactions,
  InsertTransaction,
  walletBindings,
  InsertWalletBinding,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const client = postgres(process.env.DATABASE_URL, { ssl: "require" });
      _db = drizzle(client);
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
      .onConflictDoUpdate({
        target: users.openId,
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

// ---- Wallet Bindings ----

export async function bindWallet(data: InsertWalletBinding) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .insert(walletBindings)
    .values(data)
    .onConflictDoUpdate({
      target: walletBindings.walletAddress,
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
