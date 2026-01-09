CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`upload_id` text,
	`date` integer NOT NULL,
	`description` text NOT NULL,
	`category` text,
	`amount` real NOT NULL,
	`type` text NOT NULL,
	FOREIGN KEY (`upload_id`) REFERENCES `uploads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`file_name` text NOT NULL,
	`status` text DEFAULT 'processing',
	`ai_analysis` text,
	`created_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);