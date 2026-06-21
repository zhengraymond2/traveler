import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { localLocations } from './local-locations';

export const localLocationSourceLinks = sqliteTable(
  'local_location_source_links',
  {
    id: text('id').primaryKey(),
    localLocationId: text('local_location_id')
      .notNull()
      .references(() => localLocations.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    kind: text('kind').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('local_location_source_links_local_location_id_idx').on(table.localLocationId),
    index('local_location_source_links_url_idx').on(table.url),
  ]
);

export type LocalLocationSourceLink = typeof localLocationSourceLinks.$inferSelect;
export type NewLocalLocationSourceLink = typeof localLocationSourceLinks.$inferInsert;
