import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { locations } from './locations';

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

export type LocationPhoto = typeof locationPhotos.$inferSelect;
export type NewLocationPhoto = typeof locationPhotos.$inferInsert;
