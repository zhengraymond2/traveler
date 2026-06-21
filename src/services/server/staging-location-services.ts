import { AwsEventsWriter } from '@/services/aws/aws-events';
import { AwsLocationDirectory } from '@/services/aws/aws-location-directory';
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
  const eventsWriter = await AwsEventsWriter.fromEnv(env);
  const locationDirectory = await AwsLocationDirectory.fromStagingEnv(env);
  const localLocationStore = new InMemoryLocalLocationStore();
  const locationIntakeService = createLocationIntakeService({
    eventsWriter,
    locationDirectory,
    localLocationStore,
  });

  return {
    handler: createLocationApiHandler({
      eventsWriter,
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
