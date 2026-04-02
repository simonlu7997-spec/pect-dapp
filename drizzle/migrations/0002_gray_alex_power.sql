CREATE TABLE `admin_transactions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`txType` enum('distribute_revenue','distribute_staking_reward') NOT NULL,
	`txHash` varchar(66) NOT NULL,
	`amount` decimal(36,6),
	`status` enum('pending','confirmed','failed') NOT NULL DEFAULT 'pending',
	`blockNumber` bigint,
	`errorMessage` text,
	`note` text,
	`createdBy` varchar(66),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`confirmedAt` timestamp,
	CONSTRAINT `admin_transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_transactions_txHash_unique` UNIQUE(`txHash`)
);
--> statement-breakpoint
CREATE TABLE `stations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`capacity` varchar(32) NOT NULL,
	`location` varchar(128) NOT NULL,
	`annualGeneration` decimal(18,2) NOT NULL DEFAULT '0',
	`annualRevenue` decimal(18,2) NOT NULL DEFAULT '0',
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stations_id` PRIMARY KEY(`id`)
);
