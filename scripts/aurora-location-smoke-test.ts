import type { DatabaseClient } from '../src/services/contracts';
import { createAwsStagingDatabaseFromEnv } from '../src/services/aws/aws-aurora-data-api-database';
import { SqlLocationDirectory } from '../src/services/db';

const smokeLocationName = 'Aurora Smoke Test Location';

async function main() {
  const database = await createAwsStagingDatabaseFromEnv(readProcessEnv());
  await ensureLocationsSchema(database);

  const directory = new SqlLocationDirectory(database);
  const location = await directory.upsertLocation({
    allTrailsUrl: null,
    fieldConfidence: {
      googleMapsUrl: 1,
      gpsCoordinates: 1,
      instagramFeedUrl: 1,
      name: 1,
    },
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Aurora%20Smoke%20Test%20Location',
    instagramFeedUrl: 'https://www.instagram.com/explore/tags/aurorasmoketest/',
    latitude: 37.7749,
    longitude: -122.4194,
    name: smokeLocationName,
  });
  const matches = await directory.search({
    createdAt: new Date().toISOString(),
    id: 'partial-aurora-smoke-test',
    name: smokeLocationName,
  });

  console.log(
    JSON.stringify(
      {
        matchedCount: matches.length,
        smokeLocation: {
          id: location.id,
          name: location.name,
        },
      },
      null,
      2
    )
  );
}

async function ensureLocationsSchema(database: DatabaseClient) {
  for (const sql of locationsSchemaStatements) {
    await database.execute({ sql });
  }
}

const locationsSchemaStatements = [
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
];

function readProcessEnv() {
  const globalWithProcess = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined>; exitCode?: number };
  };

  return globalWithProcess.process?.env ?? {};
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  const globalWithProcess = globalThis as typeof globalThis & {
    process?: { exitCode?: number };
  };
  if (globalWithProcess.process) {
    globalWithProcess.process.exitCode = 1;
  }
});
