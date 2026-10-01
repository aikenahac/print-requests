CREATE TABLE `filaments` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`image_path` text,
	`available` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `request_filaments` (
	`request_id` text NOT NULL,
	`filament_id` text NOT NULL,
	`position` integer NOT NULL,
	CONSTRAINT `request_filaments_pk` PRIMARY KEY(`request_id`, `filament_id`),
	CONSTRAINT `fk_request_filaments_request_id_requests_id_fk` FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_request_filaments_filament_id_filaments_id_fk` FOREIGN KEY (`filament_id`) REFERENCES `filaments`(`id`)
);
--> statement-breakpoint
CREATE TABLE `requests` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`makerworld_url` text NOT NULL,
	`quantity` integer NOT NULL,
	`notes` text,
	`urgent` integer DEFAULT false NOT NULL,
	`urgent_reason` text,
	`ams_confirmed` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`queue_position` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_requests_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text NOT NULL,
	`must_change_password` integer DEFAULT false NOT NULL,
	`credential_version` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `requests_user_idx` ON `requests` (`user_id`);--> statement-breakpoint
CREATE INDEX `requests_queue_idx` ON `requests` (`status`,`queue_position`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_lower_unique` ON `users` (lower("username"));