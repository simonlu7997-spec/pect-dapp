CREATE TYPE "public"."kyc_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."tx_status" AS ENUM('pending', 'confirmed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."tx_type" AS ENUM('stake', 'unstake', 'claim_reward', 'claim_dividend', 'purchase_private', 'purchase_public', 'approve', 'whitelist');--> statement-breakpoint
CREATE TABLE "kyc_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"fullName" varchar(128) NOT NULL,
	"email" varchar(320) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"country" varchar(64) NOT NULL,
	"investmentAmount" varchar(32) NOT NULL,
	"investmentCurrency" varchar(16) DEFAULT 'USDT' NOT NULL,
	"walletAddress" varchar(42) NOT NULL,
	"status" "kyc_status" DEFAULT 'pending' NOT NULL,
	"txHashKyc" varchar(66),
	"txHashSender" varchar(66),
	"reviewNote" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"walletAddress" varchar(42) NOT NULL,
	"txHash" varchar(66) NOT NULL,
	"txType" "tx_type" NOT NULL,
	"amount" numeric(36, 18),
	"tokenSymbol" varchar(16),
	"status" "tx_status" DEFAULT 'pending' NOT NULL,
	"blockNumber" bigint,
	"gasUsed" varchar(32),
	"errorMessage" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"confirmedAt" timestamp,
	CONSTRAINT "transactions_txHash_unique" UNIQUE("txHash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "wallet_bindings" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"walletAddress" varchar(42) NOT NULL,
	"isPrimary" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wallet_bindings_walletAddress_unique" UNIQUE("walletAddress")
);
