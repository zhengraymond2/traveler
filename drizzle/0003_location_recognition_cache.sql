CREATE TABLE `local_locations` (
	`id` text PRIMARY KEY NOT NULL,
	`canonical_location_id` text,
	`status` text NOT NULL,
	`private_description` text,
	`last_partial_location_id` text,
	`added_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`canonical_location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `local_locations_canonical_location_id_idx` ON `local_locations` (`canonical_location_id`);--> statement-breakpoint
CREATE INDEX `local_locations_status_idx` ON `local_locations` (`status`);--> statement-breakpoint
CREATE INDEX `local_locations_added_at_idx` ON `local_locations` (`added_at`);--> statement-breakpoint
CREATE TABLE `local_location_source_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`local_location_id` text NOT NULL,
	`uri` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`local_location_id`) REFERENCES `local_locations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `local_location_source_photos_local_location_id_idx` ON `local_location_source_photos` (`local_location_id`);--> statement-breakpoint
CREATE TABLE `local_location_source_links` (
	`id` text PRIMARY KEY NOT NULL,
	`local_location_id` text NOT NULL,
	`url` text NOT NULL,
	`kind` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`local_location_id`) REFERENCES `local_locations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `local_location_source_links_local_location_id_idx` ON `local_location_source_links` (`local_location_id`);--> statement-breakpoint
CREATE INDEX `local_location_source_links_url_idx` ON `local_location_source_links` (`url`);--> statement-breakpoint
ALTER TABLE `locations` ADD `instagram_feed_url` text;--> statement-breakpoint
ALTER TABLE `locations` ADD `field_confidence_json` text;