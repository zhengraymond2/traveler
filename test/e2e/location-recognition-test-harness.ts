import type { Location } from '@/services/contracts';
import { createLocationIntakeService } from '@/services/location-intake';
import { processNextPartialLocations } from '@/services/location-worker';

import { FakeLocationRecognizer } from '../local-services/fake-location-recognizer';
import { createLocalEventsStore, LocalEventsReader, LocalEventsWriter } from '../local-services/local-events';
import { LocalLocationDirectory } from '../local-services/local-location-directory';
import { LocalLocalLocationStore } from '../local-services/local-local-location-store';

export function createRecognitionTestHarness({
  canonicalLocations = [],
}: {
  canonicalLocations?: Location[];
} = {}) {
  const eventsStore = createLocalEventsStore();
  const eventsReader = new LocalEventsReader(eventsStore);
  const eventsWriter = new LocalEventsWriter(eventsStore);
  const localLocationStore = new LocalLocalLocationStore();
  const locationDirectory = new LocalLocationDirectory(canonicalLocations);
  const recognizer = new FakeLocationRecognizer();
  let nextId = 1;
  const intake = createLocationIntakeService({
    createId: () => `partial-${nextId++}`,
    eventsWriter,
    locationDirectory,
    localLocationStore,
    now: () => new Date('2026-06-21T12:00:00.000Z'),
  });

  return {
    eventsReader,
    eventsStore,
    eventsWriter,
    intake,
    localLocationStore,
    locationDirectory,
    processNext: () =>
      processNextPartialLocations({
        eventsReader,
        locationDirectory,
        localLocationStore,
        recognizer,
      }),
  };
}
