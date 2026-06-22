import { createAwsStagingDatabaseFromEnv } from '@/services/aws/aws-aurora-data-api-database';
import { ensureSqlLocationDirectorySchema, SqlLocationDirectory, SqlRecognitionJobStore } from '@/services/db';
import {
  createOpenRouterLocationRecognizer,
  loadOpenRouterConfigFromEnv,
} from '@/services/location-recognizers';
import { InMemoryLocalLocationStore } from '@/services/server/in-memory-local-location-store';

import type { LambdaWorkerDeps } from './lambda-handler';

export async function createAwsLocationRecognitionWorkerDeps(
  env: Record<string, string | undefined> = readProcessEnv()
): Promise<LambdaWorkerDeps> {
  const database = await createAwsStagingDatabaseFromEnv(env);
  await ensureSqlLocationDirectorySchema(database);

  return {
    locationDirectory: new SqlLocationDirectory(database),
    localLocationStore: new InMemoryLocalLocationStore(),
    recognizer: createOpenRouterLocationRecognizer(loadOpenRouterConfigFromEnv(env)),
    recognitionJobStore: new SqlRecognitionJobStore(database),
  };
}

function readProcessEnv() {
  const globalWithProcess = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  };

  return globalWithProcess.process?.env ?? {};
}
