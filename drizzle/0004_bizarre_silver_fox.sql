CREATE TABLE `trips` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`kind` text DEFAULT 'local' NOT NULL,
	`start_date` integer,
	`cover_photo_uri` text,
	`source_trip_id` text,
	`sync_status` text DEFAULT 'local' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `trips_kind_idx` ON `trips` (`kind`);--> statement-breakpoint
CREATE INDEX `trips_title_idx` ON `trips` (`title`);--> statement-breakpoint
CREATE INDEX `trips_start_date_idx` ON `trips` (`start_date`);--> statement-breakpoint
CREATE TABLE `trip_day_events` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`position` integer NOT NULL,
	`title` text,
	`description` text,
	`photo_uri` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `trip_day_events_trip_id_idx` ON `trip_day_events` (`trip_id`);--> statement-breakpoint
CREATE INDEX `trip_day_events_position_idx` ON `trip_day_events` (`trip_id`,`position`);--> statement-breakpoint
CREATE TABLE `trip_detail_events` (
	`id` text PRIMARY KEY NOT NULL,
	`day_event_id` text NOT NULL,
	`location_id` text,
	`category` text,
	`title` text,
	`description` text,
	`start_minute` integer NOT NULL,
	`end_minute` integer NOT NULL,
	`address_text` text,
	`google_maps_url` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`day_event_id`) REFERENCES `trip_day_events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `trip_detail_events_day_event_id_idx` ON `trip_detail_events` (`day_event_id`);--> statement-breakpoint
CREATE INDEX `trip_detail_events_time_idx` ON `trip_detail_events` (`day_event_id`,`start_minute`);--> statement-breakpoint
CREATE INDEX `trip_detail_events_location_id_idx` ON `trip_detail_events` (`location_id`);--> statement-breakpoint
CREATE TABLE `trip_detail_event_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`detail_event_id` text NOT NULL,
	`uri` text NOT NULL,
	`caption` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`detail_event_id`) REFERENCES `trip_detail_events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `trip_detail_event_photos_detail_event_id_idx` ON `trip_detail_event_photos` (`detail_event_id`);