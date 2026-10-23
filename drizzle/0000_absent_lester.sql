CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`assignee` text NOT NULL,
	`work_date` text NOT NULL,
	`priority` text DEFAULT 'today' NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`started_at` integer,
	`completed_at` integer,
	`duration_seconds` integer,
	`created_at` integer NOT NULL
);
