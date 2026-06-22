import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { tripDayEvents } from './trip-day-events';
import { locations } from './locations';

export const tripDetailEvents = sqliteTable(
  'trip_detail_events',
  {
    id: text('id').primaryKey(),
    dayEventId: text('day_event_id')
      .notNull()
      .references(() => tripDayEvents.id, { onDelete: 'cascade' }),
    locationId: text('location_id').references(() => locations.id, { onDelete: 'set null' }),
    category: text('category'),
    title: text('title'),
    description: text('description'),
    startMinute: integer('start_minute').notNull(),
    endMinute: integer('end_minute').notNull(),
    addressText: text('address_text'),
    googleMapsUrl: text('google_maps_url'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('trip_detail_events_day_event_id_idx').on(table.dayEventId),
    index('trip_detail_events_time_idx').on(table.dayEventId, table.startMinute),
    index('trip_detail_events_location_id_idx').on(table.locationId),
  ]
);

export type TripDetailEvent = typeof tripDetailEvents.$inferSelect;
export type NewTripDetailEvent = typeof tripDetailEvents.$inferInsert;
