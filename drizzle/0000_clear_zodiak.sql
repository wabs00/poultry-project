CREATE TABLE `farm_revisions` (
	`owner` text NOT NULL,
	`revision` integer NOT NULL,
	`payload` text NOT NULL,
	`action` text NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`owner`, `revision`)
);
