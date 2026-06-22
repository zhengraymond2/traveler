import { createAwsStagingDatabaseFromEnv } from '../src/services/aws/aws-aurora-data-api-database';
import { ensureSqlLocationDirectorySchema, SqlLocationDirectory } from '../src/services/db';

const smokeLocationName = 'Aurora Smoke Test Location';

async function main() {
  const database = await createAwsStagingDatabaseFromEnv(readProcessEnv());
  await ensureSqlLocationDirectorySchema(database);

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
