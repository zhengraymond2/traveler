import { createAwsStagingDatabaseFromEnv } from '../src/services/aws/aws-aurora-data-api-database';
import { AwsEventsReader, AwsEventsWriter } from '../src/services/aws/aws-events';
import type { DatabaseClient, PartialLocation, RecognitionJobStatus } from '../src/services/contracts';
import { createAwsLocationRecognitionWorkerDeps } from '../src/services/location-worker/aws-worker-deps';
import { processNextPartialLocations, type LocationWorkerResult } from '../src/services/location-worker';

type RecognitionJobRecord = {
  canonicalLocationId: string | null;
  failureReason: string | null;
  status: RecognitionJobStatus;
};

type ProcessSmokePartialLocationOptions = {
  attempts?: number;
  delayMs?: number;
  partialLocationId: string;
  processNext: () => Promise<LocationWorkerResult>;
  readRecognitionJob: (partialLocationId: string) => Promise<RecognitionJobRecord | null>;
};

async function main() {
  const env = readProcessEnv();
  if (!hasOpenRouterCredentials(env)) {
    console.log(
      'Skipping worker:openrouter-smoke because OPENROUTER_API_KEY and OPENROUTER_MODEL are not both configured.'
    );
    return;
  }

  const database = await createAwsStagingDatabaseFromEnv(env);
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

  const { recognitionJob, workerResults } = await processSmokePartialLocation({
    partialLocationId: partialLocation.id,
    processNext: () =>
      processNextPartialLocations(
        {
          eventsReader,
          locationDirectory: deps.locationDirectory,
          localLocationStore: deps.localLocationStore,
          recognizer: deps.recognizer,
          recognitionJobStore: deps.recognitionJobStore,
        },
        { limit: 5 }
      ),
    readRecognitionJob: (partialLocationId) => readRecognitionJob(database, partialLocationId),
  });

  console.log(
    JSON.stringify(
      {
        canonicalLocationId: recognitionJob.canonicalLocationId,
        partialLocationId: partialLocation.id,
        recognitionJobStatus: recognitionJob.status,
        workerResults,
      },
      null,
      2
    )
  );
}

export async function processSmokePartialLocation({
  attempts = 5,
  delayMs = 1000,
  partialLocationId,
  processNext,
  readRecognitionJob,
}: ProcessSmokePartialLocationOptions) {
  const workerResults: LocationWorkerResult[] = [];

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    workerResults.push(await processNext());
    const recognitionJob = await readRecognitionJob(partialLocationId);
    if (recognitionJob?.status === 'matched') {
      return { recognitionJob, workerResults };
    }
    if (recognitionJob?.status === 'needsReview' || recognitionJob?.status === 'failed') {
      throw new Error(
        `OpenRouter smoke partialLocation ${partialLocationId} completed with ${recognitionJob.status}: ${
          recognitionJob.failureReason ?? 'no failure reason recorded'
        }`
      );
    }
    if (attempt < attempts - 1) {
      await sleep(delayMs);
    }
  }

  throw new Error(`OpenRouter smoke partialLocation ${partialLocationId} was not processed after ${attempts} attempts.`);
}

export async function readRecognitionJob(
  database: DatabaseClient,
  partialLocationId: string
): Promise<RecognitionJobRecord | null> {
  const result = await database.execute<{
    canonicalLocationId: string | null;
    failureReason: string | null;
    status: RecognitionJobStatus;
  }>({
    sql: `
      select
        canonical_location_id as "canonicalLocationId",
        failure_reason as "failureReason",
        status as "status"
      from recognition_jobs
      where partial_location_id = :partialLocationId
    `,
    parameters: { partialLocationId },
  });

  return result.rows[0] ?? null;
}

function hasOpenRouterCredentials(env: Record<string, string | undefined>) {
  return Boolean(env.OPENROUTER_API_KEY?.trim() && env.OPENROUTER_MODEL?.trim());
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readProcessEnv() {
  const globalWithProcess = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined>; exitCode?: number };
  };

  return globalWithProcess.process?.env ?? {};
}

function handleMainError(error: unknown) {
  console.error(error instanceof Error ? error.message : error);
  const globalWithProcess = globalThis as typeof globalThis & {
    process?: { exitCode?: number };
  };
  if (globalWithProcess.process) {
    globalWithProcess.process.exitCode = 1;
  }
}

if (require.main === module) {
  void main().catch(handleMainError);
}
