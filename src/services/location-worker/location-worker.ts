import type {
  EventsReader,
  LocalLocationStore,
  LocationDirectory,
  LocationRecognizer,
  QueuedPartialLocation,
} from '@/services/contracts';

export type LocationWorkerDeps = {
  eventsReader: EventsReader;
  locationDirectory: LocationDirectory;
  localLocationStore: LocalLocationStore;
  recognizer: LocationRecognizer;
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

async function processMessage(
  deps: LocationWorkerDeps,
  message: QueuedPartialLocation,
  result: LocationWorkerResult
) {
  result.processed += 1;
  const recognized = await deps.recognizer.recognize(message.event);
  const localLocation = await deps.localLocationStore.findByPartialLocation(message.event);

  if (recognized.kind === 'recognized') {
    const location = await deps.locationDirectory.upsertLocation(recognized.location, {
      partialLocation: message.event,
    });
    if (localLocation) {
      await deps.localLocationStore.linkCanonicalLocation(localLocation.id, location.id);
    }
    await deps.eventsReader.ack(message.messageId);
    result.acknowledged += 1;
    result.matched += 1;
    return;
  }

  if (recognized.kind === 'needsReview') {
    // TODO: Decide the confidence threshold UX for fields below 0.8.
    // For now, mark the local record so the app can show a manual review state.
    if (localLocation) {
      await deps.localLocationStore.updateStatus(localLocation.id, 'needsReview');
    }
    await deps.eventsReader.ack(message.messageId);
    result.acknowledged += 1;
    result.failed += 1;
    return;
  }

  // TODO: Replace this first-slice failure behavior with retry backoff and a
  // dead-letter queue once the AWS/SQS worker adapter is introduced.
  // TODO: Capture OpenRouter vision/network errors separately from recognizer
  // low-confidence results when the real recognizer replaces the fixture fake.
  if (localLocation) {
    await deps.localLocationStore.updateStatus(localLocation.id, 'failed');
  }
  await deps.eventsReader.ack(message.messageId);
  result.acknowledged += 1;
  result.failed += 1;
}
