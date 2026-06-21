import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { collections } from './collections';
import { locations } from './locations';

export const collectionLocations = sqliteTable(
  'collection_locations',
  {
    collectionId: text('collection_id')
      .notNull()
      .references(() => collections.id, { onDelete: 'cascade' }),
    locationId: text('location_id')
      .notNull()
      .references(() => locations.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.collectionId, table.locationId] }),
    index('collection_locations_location_id_idx').on(table.locationId),
  ]
);

export type CollectionLocation = typeof collectionLocations.$inferSelect;
export type NewCollectionLocation = typeof collectionLocations.$inferInsert;
