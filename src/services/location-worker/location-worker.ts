import type {
  EventsReader,
  LocalLocationStore,
  LocationDirectory,
  LocationRecognizer,
  QueuedPartialLocation,
  RecognitionJobStore,
} from '@/services/contracts';

export type LocationWorkerDeps = {
  eventsReader: EventsReader;
  locationDirectory: LocationDirectory;
  localLocationStore: LocalLocationStore;
  recognizer: LocationRecognizer;
  recognitionJobStore?: RecognitionJobStore;
};

export type LocationWorkerOptions = {
  limit?: number;
};

export type LocationWorkerResult = {
  acknowledged: number;
  failed: number;
  matched: number;
  processed: number;
};

export type QueuedLocationWorkerResult =
  | { outcome: 'matched'; locationId: string }
  | { outcome: 'needsReview'; reason: string }
  | { outcome: 'retry'; reason: string };

export async function processNextPartialLocations(
  deps: LocationWorkerDeps,
  options: LocationWorkerOptions = {}
): Promise<LocationWorkerResult> {
  const messages = await deps.eventsReader.receivePartialLocations(options.limit ?? 5);
  const result: LocationWorkerResult = {
    acknowledged: 0,
    failed: 0,
    matched: 0,
    processed: 0,
  };

  for (const message of messages) {
    await processMessage(deps, message, result);
  }

  return result;
}

export async function processQueuedPartialLocation(
  deps: Omit<LocationWorkerDeps, 'eventsReader'>,
  message: QueuedPartialLocation
): Promise<QueuedLocationWorkerResult> {
  const recognized = await deps.recognizer.recognize(message.event);
  const localLocation = await deps.localLocationStore.findByPartialLocation(message.event);

  if (recognized.kind === 'recognized') {
    const location = await deps.locationDirectory.upsertLocation(recognized.location, {
      partialLocation: message.event,
    });
    if (localLocation) {
      await deps.localLocationStore.linkCanonicalLocation(localLocation.id, location.id);
    }
    await deps.recognitionJobStore?.markMatched(message.event.id, {
      location,
      recognizedLocation: recognized.location,
    });
    return { locationId: location.id, outcome: 'matched' };
  }

  if (recognized.kind === 'needsReview') {
    if (localLocation) {
      await deps.localLocationStore.updateStatus(localLocation.id, 'needsReview');
    }
    await deps.recognitionJobStore?.markNeedsReview(message.event.id, {
      reason: recognized.reason,
      recognizedLocation: recognized.location,
    });
    return { outcome: 'needsReview', reason: recognized.reason };
  }

  return { outcome: 'retry', reason: recognized.reason };
}

async function processMessage(
  deps: LocationWorkerDeps,
  message: QueuedPartialLocation,
  result: LocationWorkerResult
) {
  result.processed += 1;
  const messageResult = await processQueuedPartialLocation(deps, message);

  if (messageResult.outcome === 'matched') {
    await deps.eventsReader.ack(message.messageId);
    result.acknowledged += 1;
    result.matched += 1;
    return;
  }

  if (messageResult.outcome === 'needsReview') {
    await deps.eventsReader.ack(message.messageId);
    result.acknowledged += 1;
    result.failed += 1;
    return;
  }

  result.failed += 1;
}
