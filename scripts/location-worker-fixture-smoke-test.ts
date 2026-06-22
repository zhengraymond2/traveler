import { AwsEventsReader, AwsEventsWriter } from '../src/services/aws/aws-events';
import { createAwsStagingDatabaseFromEnv } from '../src/services/aws/aws-aurora-data-api-database';
import { AwsLocationDirectory } from '../src/services/aws/aws-location-directory';
import type { PartialLocation } from '../src/services/contracts';
import { ensureSqlLocationDirectorySchema } from '../src/services/db';
import { createFixtureLocationRecognizer, greatWallFixturePhotoUri } from '../src/services/location-recognizers';
import { processNextPartialLocations } from '../src/services/location-worker';
import { InMemoryLocalLocationStore } from '../src/services/server';

async function main() {
  const env = readProcessEnv();
  await ensureSqlLocationDirectorySchema(await createAwsStagingDatabaseFromEnv(env));
  const eventsWriter = await AwsEventsWriter.fromEnv(env);
  const eventsReader = await AwsEventsReader.fromEnv(env);
  const locationDirectory = await AwsLocationDirectory.fromStagingEnv(env);
  const localLocationStore = new InMemoryLocalLocationStore();
  const partialLocation: PartialLocation = {
    createdAt: new Date().toISOString(),
    id: `partial-worker-fixture-${Date.now().toString(36)}`,
    sourcePhotoUris: [greatWallFixturePhotoUri],
  };

  await localLocationStore.upsertFromPartialLocation({
    partialLocation,
    source: { sourcePhotoUris: partialLocation.sourcePhotoUris },
    status: 'processing',
  });
  await eventsWriter.enqueuePartialLocation(partialLocation);

  const workerResult = await processNextPartialLocations(
    {
      eventsReader,
      localLocationStore,
      locationDirectory,
      recognizer: createFixtureLocationRecognizer(),
    },
    { limit: 10 }
  );
  const matches = await locationDirectory.search({
    createdAt: new Date().toISOString(),
    id: 'partial-worker-fixture-search',
    name: 'Great Wall of China',
  });

  if (!matches.some((match) => match.location.name === 'Great Wall of China')) {
    throw new Error('Worker fixture did not write Great Wall of China to Aurora.');
  }

  console.log(
    JSON.stringify(
      {
        matchedLocations: matches.map((match) => match.location.name),
        partialLocationId: partialLocation.id,
        workerResult,
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
