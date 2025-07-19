CREATE TABLE `battles` (
	`id` text PRIMARY KEY NOT NULL,
	`state` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`creatureImage` text,
	`health` integer DEFAULT 100 NOT NULL,
	`attack` integer DEFAULT 10 NOT NULL,
	`defense` integer DEFAULT 5 NOT NULL,
	`speed` integer DEFAULT 5 NOT NULL,
	`abilities` text,
	`evolutionPoints` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_name_unique` ON `users` (`name`);