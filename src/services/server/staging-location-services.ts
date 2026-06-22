import { AwsEventsWriter } from '@/services/aws/aws-events';
import { createAwsStagingDatabaseFromEnv } from '@/services/aws/aws-aurora-data-api-database';
import { ensureSqlLocationDirectorySchema, SqlLocationDirectory, SqlRecognitionJobStore } from '@/services/db';
import { createLocationIntakeService, type LocationIntakeService } from '@/services/location-intake';

import { InMemoryLocalLocationStore } from './in-memory-local-location-store';
import { createLocationApiHandler, type LocationApiHandler } from './location-api-handler';

export type StagingLocationServices = {
  handler: LocationApiHandler;
  locationIntakeService: LocationIntakeService;
  localLocationStore: InMemoryLocalLocationStore;
};

export async function createStagingLocationServices(
  env: Record<string, string | undefined> = readProcessEnv()
): Promise<StagingLocationServices> {
  const database = await createAwsStagingDatabaseFromEnv(env);
  await ensureSqlLocationDirectorySchema(database);
  const eventsWriter = await AwsEventsWriter.fromEnv(env);
  const locationDirectory = new SqlLocationDirectory(database);
  const localLocationStore = new InMemoryLocalLocationStore();
  const recognitionJobStore = new SqlRecognitionJobStore(database);
  const locationIntakeService = createLocationIntakeService({
    eventsWriter,
    locationDirectory,
    localLocationStore,
    recognitionJobStore,
  });

  return {
    handler: createLocationApiHandler({
      eventsWriter,
      locationDirectory,
      locationIntakeService,
    }),
    locationIntakeService,
    localLocationStore,
  };
}

function readProcessEnv() {
  const globalWithProcess = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  };

  return globalWithProcess.process?.env ?? {};
}
