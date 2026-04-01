CREATE TABLE `kyc_applications` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`fullName` varchar(128) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`country` varchar(64) NOT NULL,
	`investmentAmount` varchar(32) NOT NULL,
	`investmentCurrency` varchar(16) NOT NULL DEFAULT 'USDT',
	`walletAddress` varchar(42) NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`txHashKyc` varchar(66),
	`txHashSender` varchar(66),
	`reviewNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `kyc_applications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `siwe_nonces` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`address` varchar(42) NOT NULL,
	`nonce` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `siwe_nonces_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`walletAddress` varchar(42) NOT NULL,
	`txHash` varchar(66) NOT NULL,
	`txType` enum('stake','unstake','claim_reward','claim_dividend','purchase_private','purchase_public','approve','whitelist') NOT NULL,
	`amount` decimal(36,18),
	`tokenSymbol` varchar(16),
	`status` enum('pending','confirmed','failed') NOT NULL DEFAULT 'pending',
	`blockNumber` bigint,
	`gasUsed` varchar(32),
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`confirmedAt` timestamp,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `transactions_txHash_unique` UNIQUE(`txHash`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE TABLE `wallet_bindings` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`walletAddress` varchar(42) NOT NULL,
	`isPrimary` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wallet_bindings_id` PRIMARY KEY(`id`),
	CONSTRAINT `wallet_bindings_walletAddress_unique` UNIQUE(`walletAddress`)
);
