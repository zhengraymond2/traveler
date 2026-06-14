CREATE TABLE `location_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`location_id` text NOT NULL,
	`uri` text NOT NULL,
	`caption` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `location_photos_location_id_idx` ON `location_photos` (`location_id`);--> statement-breakpoint
CREATE TABLE `locations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`latitude` real,
	`longitude` real,
	`google_maps_url` text,
	`instagram_url` text,
	`notes` text,
	`country` text,
	`category` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `locations_country_idx` ON `locations` (`country`);--> statement-breakpoint
CREATE INDEX `locations_category_idx` ON `locations` (`category`);--> statement-breakpoint
CREATE INDEX `locations_created_at_idx` ON `locations` (`created_at`);