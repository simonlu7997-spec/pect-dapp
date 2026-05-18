CREATE TABLE `calculator_params` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`exchangeRate` decimal(10,4) NOT NULL DEFAULT '7.2',
	`electricityPrice` decimal(10,4) NOT NULL DEFAULT '1.109',
	`annualDividendPool` decimal(18,4) NOT NULL DEFAULT '41155',
	`phase1TokenRatio` decimal(5,4) NOT NULL DEFAULT '0.75',
	`phase2TokenRatio` decimal(5,4) NOT NULL DEFAULT '1.0',
	`totalPvcSupply` int NOT NULL DEFAULT 4000000,
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedBy` varchar(42),
	CONSTRAINT `calculator_params_id` PRIMARY KEY(`id`)
);
