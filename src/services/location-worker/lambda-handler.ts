import type {
  LocationDirectory,
  LocationRecognizer,
  LocalLocationStore,
  PartialLocation,
  QueuedPartialLocation,
  RecognitionJobStore,
} from '@/services/contracts';

import { createAwsLocationRecognitionWorkerDeps } from './aws-worker-deps';
import { processQueuedPartialLocation } from './location-worker';

export type SqsLambdaEvent = {
  Records?: {
    body?: string;
    messageId?: string;
  }[];
};

export type SqsBatchResponse = {
  batchItemFailures: { itemIdentifier: string }[];
};

export type LambdaWorkerDeps = {
  locationDirectory: LocationDirectory;
  localLocationStore: LocalLocationStore;
  recognizer: LocationRecognizer;
  recognitionJobStore?: RecognitionJobStore;
};

export type LambdaWorkerDepsFactory = () => Promise<LambdaWorkerDeps>;

export function createLocationRecognitionLambdaHandler(
  createDeps: LambdaWorkerDepsFactory = createAwsLocationRecognitionWorkerDeps
) {
  return async function locationRecognitionLambdaHandler(
    event: SqsLambdaEvent
  ): Promise<SqsBatchResponse> {
    const batchItemFailures: { itemIdentifier: string }[] = [];
    let deps: LambdaWorkerDeps | null = null;

    for (const [index, record] of (event.Records ?? []).entries()) {
      const messageId = getItemIdentifier(record.messageId, index);

      try {
        const parsed = parseRecord(record.body);

        if (!parsed) {
          batchItemFailures.push({ itemIdentifier: messageId });
          continue;
        }

        deps = deps ?? (await createDeps());

        const result = await processQueuedPartialLocation(deps, {
          event: parsed,
          messageId,
          receiveCount: 1,
          receivedAt: new Date().toISOString(),
        } satisfies QueuedPartialLocation);

        if (result.outcome === 'retry') {
          batchItemFailures.push({ itemIdentifier: messageId });
        }
      } catch {
        batchItemFailures.push({ itemIdentifier: messageId });
      }
    }

    return { batchItemFailures };
  };
}

export const locationRecognitionLambdaHandler = createLocationRecognitionLambdaHandler();

function parseRecord(body: string | undefined): PartialLocation | null {
  if (!body) {
    return null;
  }

  try {
    return JSON.parse(body) as PartialLocation;
  } catch {
    return null;
  }
}

function getItemIdentifier(messageId: string | undefined, index: number): string {
  if (messageId && messageId.length > 0) {
    return messageId;
  }

  return `record-${index}`;
}
