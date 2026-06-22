import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { trips } from './trips';

export const tripDayEvents = sqliteTable(
  'trip_day_events',
  {
    id: text('id').primaryKey(),
    tripId: text('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    title: text('title'),
    description: text('description'),
    photoUri: text('photo_uri'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('trip_day_events_trip_id_idx').on(table.tripId),
    index('trip_day_events_position_idx').on(table.tripId, table.position),
  ]
);

export type TripDayEvent = typeof tripDayEvents.$inferSelect;
export type NewTripDayEvent = typeof tripDayEvents.$inferInsert;
