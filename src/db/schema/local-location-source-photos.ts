import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { localLocations } from './local-locations';

export const localLocationSourcePhotos = sqliteTable(
  'local_location_source_photos',
  {
    id: text('id').primaryKey(),
    localLocationId: text('local_location_id')
      .notNull()
      .references(() => localLocations.id, { onDelete: 'cascade' }),
    uri: text('uri').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('local_location_source_photos_local_location_id_idx').on(table.localLocationId)]
);

export type LocalLocationSourcePhoto = typeof localLocationSourcePhotos.$inferSelect;
export type NewLocalLocationSourcePhoto = typeof localLocationSourcePhotos.$inferInsert;
