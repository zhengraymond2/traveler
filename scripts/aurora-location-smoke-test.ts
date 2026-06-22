import { createAwsStagingDatabaseFromEnv } from '../src/services/aws/aws-aurora-data-api-database';
import { ensureSqlLocationDirectorySchema, SqlLocationDirectory } from '../src/services/db';

const smokeLocationName = 'Aurora Smoke Test Location';
const smokeInstagramUrl = 'https://instagram.com/p/AuroraSmokeLocation/?utm_source=ig_web_copy_link';

async function main() {
  const database = await createAwsStagingDatabaseFromEnv(readProcessEnv());
  await ensureSqlLocationDirectorySchema(database);

  const directory = new SqlLocationDirectory(database);
  const location = await directory.upsertLocation(
    {
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
    },
    {
      partialLocation: {
        createdAt: new Date().toISOString(),
        id: 'partial-aurora-instagram-smoke-test',
        instagramUrls: [smokeInstagramUrl],
      },
    }
  );
  const matches = await directory.search({
    createdAt: new Date().toISOString(),
    id: 'partial-aurora-smoke-test',
    name: smokeLocationName,
  });
  const instagramMatches = await directory.search({
    createdAt: new Date().toISOString(),
    id: 'partial-aurora-instagram-smoke-test',
    instagramUrls: ['https://www.instagram.com/p/AuroraSmokeLocation/'],
  });

  console.log(
    JSON.stringify(
      {
        matchedCount: matches.length,
        smokeLocation: {
          id: location.id,
          name: location.name,
        },
        instagramMatchedCount: instagramMatches.length,
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
