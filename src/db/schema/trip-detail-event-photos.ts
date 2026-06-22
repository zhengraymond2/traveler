import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { tripDetailEvents } from './trip-detail-events';

export const tripDetailEventPhotos = sqliteTable(
  'trip_detail_event_photos',
  {
    id: text('id').primaryKey(),
    detailEventId: text('detail_event_id')
      .notNull()
      .references(() => tripDetailEvents.id, { onDelete: 'cascade' }),
    uri: text('uri').notNull(),
    caption: text('caption'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('trip_detail_event_photos_detail_event_id_idx').on(table.detailEventId)]
);

export type TripDetailEventPhoto = typeof tripDetailEventPhotos.$inferSelect;
export type NewTripDetailEventPhoto = typeof tripDetailEventPhotos.$inferInsert;
