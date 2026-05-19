ALTER TABLE `calculator_params` MODIFY COLUMN `exchangeRate` decimal(10,4) NOT NULL DEFAULT '6.8';--> statement-breakpoint
ALTER TABLE `calculator_params` ADD `annualStakingPool` decimal(18,4) DEFAULT '4573' NOT NULL;--> statement-breakpoint
ALTER TABLE `calculator_params` ADD `c2cAnnualAirdrop` decimal(18,0) DEFAULT '382990' NOT NULL;--> statement-breakpoint
ALTER TABLE `calculator_params` ADD `c2cStakingRate` decimal(5,4) DEFAULT '0.5' NOT NULL;