import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const collectionKinds = ['local', 'shared'] as const;
export type CollectionKind = (typeof collectionKinds)[number];

export const collections = sqliteTable(
  'collections',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    kind: text('kind', { enum: collectionKinds }).notNull().default('local'),
    sourceCollectionId: text('source_collection_id'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('collections_kind_idx').on(table.kind),
    index('collections_title_idx').on(table.title),
  ]
);

export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;
