import { AwsEventsReader, AwsEventsWriter } from '../src/services/aws/aws-events';
import type { PartialLocation } from '../src/services/contracts';
import { createAwsLocationRecognitionWorkerDeps } from '../src/services/location-worker/aws-worker-deps';
import { processNextPartialLocations } from '../src/services/location-worker';

async function main() {
  const env = readProcessEnv();
  if (!hasOpenRouterCredentials(env)) {
    console.log(
      'Skipping worker:openrouter-smoke because OPENROUTER_API_KEY and OPENROUTER_MODEL are not both configured.'
    );
    return;
  }

  const eventsWriter = await AwsEventsWriter.fromEnv(env);
  const eventsReader = await AwsEventsReader.fromEnv(env);
  const deps = await createAwsLocationRecognitionWorkerDeps(env);
  const partialLocation: PartialLocation = {
    createdAt: new Date().toISOString(),
    id: `partial-openrouter-smoke-${Date.now().toString(36)}`,
    name: 'Great Wall of China',
    textCaption: 'OpenRouter smoke test for Traveler location recognition.',
  };

  await deps.recognitionJobStore?.createProcessing(partialLocation);
  await eventsWriter.enqueuePartialLocation(partialLocation);

  const workerResult = await processNextPartialLocations(
    {
      eventsReader,
      locationDirectory: deps.locationDirectory,
      localLocationStore: deps.localLocationStore,
      recognizer: deps.recognizer,
      recognitionJobStore: deps.recognitionJobStore,
    },
    { limit: 5 }
  );

  if (workerResult.matched < 1) {
    throw new Error(`OpenRouter smoke worker did not match a location: ${JSON.stringify(workerResult)}`);
  }

  console.log(
    JSON.stringify(
      {
        partialLocationId: partialLocation.id,
        workerResult,
      },
      null,
      2
    )
  );
}

function hasOpenRouterCredentials(env: Record<string, string | undefined>) {
  return Boolean(env.OPENROUTER_API_KEY?.trim() && env.OPENROUTER_MODEL?.trim());
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
