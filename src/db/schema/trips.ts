import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const tripKinds = ['local', 'shared'] as const;
export type TripKind = (typeof tripKinds)[number];

export const tripSyncStatuses = ['local', 'pending', 'synced', 'conflict'] as const;
export type TripSyncStatus = (typeof tripSyncStatuses)[number];

export const trips = sqliteTable(
  'trips',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    kind: text('kind', { enum: tripKinds }).notNull().default('local'),
    startDate: integer('start_date', { mode: 'timestamp_ms' }),
    coverPhotoUri: text('cover_photo_uri'),
    sourceTripId: text('source_trip_id'),
    syncStatus: text('sync_status', { enum: tripSyncStatuses }).notNull().default('local'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('trips_kind_idx').on(table.kind),
    index('trips_title_idx').on(table.title),
    index('trips_start_date_idx').on(table.startDate),
  ]
);

export type Trip = typeof trips.$inferSelect;
export type NewTrip = typeof trips.$inferInsert;
