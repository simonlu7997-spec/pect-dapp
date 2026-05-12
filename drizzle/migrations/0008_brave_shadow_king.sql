CREATE TABLE `station_snapshots` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`deviceSerial` varchar(32) NOT NULL,
	`channelNo` int NOT NULL,
	`stationName` varchar(128) NOT NULL,
	`imageUrl` text NOT NULL,
	`capturedAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `station_snapshots_id` PRIMARY KEY(`id`)
);
