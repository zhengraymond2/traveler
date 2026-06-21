import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { locations } from './locations';

export const localLocations = sqliteTable(
  'local_locations',
  {
    id: text('id').primaryKey(),
    canonicalLocationId: text('canonical_location_id').references(() => locations.id, { onDelete: 'set null' }),
    status: text('status').notNull(),
    privateDescription: text('private_description'),
    lastPartialLocationId: text('last_partial_location_id'),
    addedAt: integer('added_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('local_locations_canonical_location_id_idx').on(table.canonicalLocationId),
    index('local_locations_status_idx').on(table.status),
    index('local_locations_added_at_idx').on(table.addedAt),
  ]
);

export type LocalLocation = typeof localLocations.$inferSelect;
export type NewLocalLocation = typeof localLocations.$inferInsert;
