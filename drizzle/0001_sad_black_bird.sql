CREATE TABLE `kyc_applications` (
	`id` int AUTO_INCREMENT NOT NULL,
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
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kyc_applications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
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
CREATE TABLE `wallet_bindings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`walletAddress` varchar(42) NOT NULL,
	`isPrimary` enum('yes','no') NOT NULL DEFAULT 'no',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wallet_bindings_id` PRIMARY KEY(`id`),
	CONSTRAINT `wallet_bindings_walletAddress_unique` UNIQUE(`walletAddress`)
);
