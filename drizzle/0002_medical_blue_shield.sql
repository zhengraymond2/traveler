CREATE TABLE `collection_locations` (
	`collection_id` text NOT NULL,
	`location_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`collection_id`, `location_id`),
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `collection_locations_location_id_idx` ON `collection_locations` (`location_id`);--> statement-breakpoint
CREATE TABLE `collections` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`kind` text DEFAULT 'local' NOT NULL,
	`source_collection_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `collections_kind_idx` ON `collections` (`kind`);--> statement-breakpoint
CREATE INDEX `collections_title_idx` ON `collections` (`title`);