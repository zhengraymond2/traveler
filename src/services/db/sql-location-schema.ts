import type { DatabaseClient } from '@/services/contracts';

export async function ensureSqlLocationDirectorySchema(database: DatabaseClient) {
  for (const sql of sqlLocationDirectorySchemaStatements) {
    await database.execute({ sql });
  }
}

export const sqlLocationDirectorySchemaStatements = [
  `
    create table if not exists locations (
      id text primary key,
      name text,
      google_maps_url text,
      latitude double precision,
      longitude double precision,
      trail_map_url text,
      instagram_feed_url text,
      field_confidence_json text,
      created_at timestamptz not null,
      updated_at timestamptz not null
    )
  `,
  'create index if not exists locations_lower_name_idx on locations (lower(name))',
  'create index if not exists locations_google_maps_url_idx on locations (google_maps_url)',
  'create index if not exists locations_coordinates_idx on locations (latitude, longitude)',
  `
    create table if not exists location_instagram_links (
      id text primary key,
      location_id text not null references locations(id) on delete cascade,
      original_url text not null,
      canonical_url text not null unique,
      created_at timestamptz not null
    )
  `,
  'create index if not exists location_instagram_links_location_id_idx on location_instagram_links (location_id)',
  'create unique index if not exists location_instagram_links_canonical_url_idx on location_instagram_links (canonical_url)',
];
