import { relations } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const locations = sqliteTable(
  'locations',
  {
    id: text('id').primaryKey(),
    name: text('name'),
    latitude: real('latitude'),
    longitude: real('longitude'),
    googleMapsUrl: text('google_maps_url'),
    instagramUrl: text('instagram_url'),
    notes: text('notes'),
    country: text('country'),
    category: text('category'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('locations_country_idx').on(table.country),
    index('locations_category_idx').on(table.category),
    index('locations_created_at_idx').on(table.createdAt),
  ]
);

export const locationPhotos = sqliteTable(
  'location_photos',
  {
    id: text('id').primaryKey(),
    locationId: text('location_id')
      .notNull()
      .references(() => locations.id, { onDelete: 'cascade' }),
    uri: text('uri').notNull(),
    caption: text('caption'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('location_photos_location_id_idx').on(table.locationId)]
);

export const locationsRelations = relations(locations, ({ many }) => ({
  photos: many(locationPhotos),
}));

export const locationPhotosRelations = relations(locationPhotos, ({ one }) => ({
  location: one(locations, {
    fields: [locationPhotos.locationId],
    references: [locations.id],
  }),
}));

export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
export type LocationPhoto = typeof locationPhotos.$inferSelect;
export type NewLocationPhoto = typeof locationPhotos.$inferInsert;
