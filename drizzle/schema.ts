import {
  bigint,
  boolean,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// Enums (MySQL uses inline enum columns, not separate enum types)
const roleValues = ["user", "admin"] as const;
const kycStatusValues = ["pending", "approved", "rejected"] as const;
const txTypeValues = [
  "stake",
  "unstake",
  "claim_reward",
  "claim_dividend",
  "purchase_private",
  "purchase_public",
  "approve",
  "whitelist",
] as const;
const txStatusValues = ["pending", "confirmed", "failed"] as const;

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  /** Wallet address (SIWE) or Manus OAuth openId */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", roleValues).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * KYC 白名单申请记录表
 */
export const kycApplications = mysqlTable("kyc_applications", {
  id: serial("id").primaryKey(),
  fullName: varchar("fullName", { length: 128 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  country: varchar("country", { length: 64 }).notNull(),
  investmentAmount: varchar("investmentAmount", { length: 32 }).notNull(),
  investmentCurrency: varchar("investmentCurrency", { length: 16 }).default("USDT").notNull(),
  walletAddress: varchar("walletAddress", { length: 42 }).notNull(),
  status: mysqlEnum("status", kycStatusValues).default("pending").notNull(),
  txHashKyc: varchar("txHashKyc", { length: 66 }),
  txHashSender: varchar("txHashSender", { length: 66 }),
  reviewNote: text("reviewNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type KycApplication = typeof kycApplications.$inferSelect;
export type InsertKycApplication = typeof kycApplications.$inferInsert;

/**
 * 区块链交易记录表
 */
export const transactions = mysqlTable("transactions", {
  id: serial("id").primaryKey(),
  walletAddress: varchar("walletAddress", { length: 42 }).notNull(),
  txHash: varchar("txHash", { length: 66 }).notNull().unique(),
  txType: mysqlEnum("txType", txTypeValues).notNull(),
  amount: decimal("amount", { precision: 36, scale: 18 }),
  tokenSymbol: varchar("tokenSymbol", { length: 16 }),
  status: mysqlEnum("status", txStatusValues).default("pending").notNull(),
  blockNumber: bigint("blockNumber", { mode: "number" }),
  gasUsed: varchar("gasUsed", { length: 32 }),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  confirmedAt: timestamp("confirmedAt"),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

/**
 * 用户钱包绑定表
 */
export const walletBindings = mysqlTable("wallet_bindings", {
  id: serial("id").primaryKey(),
  userId: int("userId").notNull(),
  walletAddress: varchar("walletAddress", { length: 42 }).notNull().unique(),
  isPrimary: boolean("isPrimary").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WalletBinding = typeof walletBindings.$inferSelect;
export type InsertWalletBinding = typeof walletBindings.$inferInsert;
