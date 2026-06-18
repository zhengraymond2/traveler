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
    trailMapUrl: text('trail_map_url'),
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

export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
