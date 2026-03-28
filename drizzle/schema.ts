import {
  bigint,
  boolean,
  decimal,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// Enums
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const kycStatusEnum = pgEnum("kyc_status", ["pending", "approved", "rejected"]);
export const txTypeEnum = pgEnum("tx_type", [
  "stake",
  "unstake",
  "claim_reward",
  "claim_dividend",
  "purchase_private",
  "purchase_public",
  "approve",
  "whitelist",
]);
export const txStatusEnum = pgEnum("tx_status", ["pending", "confirmed", "failed"]);

/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  /** Wallet address (SIWE) or Manus OAuth openId */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * KYC 白名单申请记录表
 */
export const kycApplications = pgTable("kyc_applications", {
  id: serial("id").primaryKey(),
  fullName: varchar("fullName", { length: 128 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  country: varchar("country", { length: 64 }).notNull(),
  investmentAmount: varchar("investmentAmount", { length: 32 }).notNull(),
  investmentCurrency: varchar("investmentCurrency", { length: 16 }).default("USDT").notNull(),
  walletAddress: varchar("walletAddress", { length: 42 }).notNull(),
  status: kycStatusEnum("status").default("pending").notNull(),
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
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  walletAddress: varchar("walletAddress", { length: 42 }).notNull(),
  txHash: varchar("txHash", { length: 66 }).notNull().unique(),
  txType: txTypeEnum("txType").notNull(),
  amount: decimal("amount", { precision: 36, scale: 18 }),
  tokenSymbol: varchar("tokenSymbol", { length: 16 }),
  status: txStatusEnum("status").default("pending").notNull(),
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
export const walletBindings = pgTable("wallet_bindings", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  walletAddress: varchar("walletAddress", { length: 42 }).notNull().unique(),
  isPrimary: boolean("isPrimary").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WalletBinding = typeof walletBindings.$inferSelect;
export type InsertWalletBinding = typeof walletBindings.$inferInsert;
