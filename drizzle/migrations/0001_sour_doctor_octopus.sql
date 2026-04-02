CREATE TABLE `revenue_records` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`periodLabel` varchar(32) NOT NULL,
	`periodYear` int NOT NULL,
	`periodMonth` int NOT NULL,
	`totalGeneration` decimal(18,4) NOT NULL,
	`totalRevenue` decimal(18,4) NOT NULL,
	`dividendPool` decimal(18,4) NOT NULL,
	`exchangeRate` decimal(10,4) NOT NULL,
	`snapshotBlock` bigint,
	`txHash` varchar(66),
	`note` text,
	`createdBy` varchar(42),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `revenue_records_id` PRIMARY KEY(`id`)
);
