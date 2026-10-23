ALTER TABLE `tasks` ADD `postponed_reason` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `previous_work_date` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `postponed_at` integer;--> statement-breakpoint
ALTER TABLE `tasks` ADD `transfer_count` integer DEFAULT 0 NOT NULL;