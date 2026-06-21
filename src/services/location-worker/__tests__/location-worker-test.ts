import { processNextPartialLocations } from '../location-worker';
import { greatWallSourceFixture } from '../../../../test/fixtures/location-recognition/great-wall-source';
import { FakeLocationRecognizer } from '../../../../test/local-services/fake-location-recognizer';
import {
  createLocalEventsStore,
  LocalEventsReader,
  LocalEventsWriter,
} from '../../../../test/local-services/local-events';
import { LocalLocationDirectory } from '../../../../test/local-services/local-location-directory';
import { LocalLocalLocationStore } from '../../../../test/local-services/local-local-location-store';

describe('location worker', () => {
  test('processes an image-only event and links a matched local location', async () => {
    const eventStore = createLocalEventsStore();
    const eventsWriter = new LocalEventsWriter(eventStore);
    const eventsReader = new LocalEventsReader(eventStore);
    const localLocationStore = new LocalLocalLocationStore();
    const locationDirectory = new LocalLocationDirectory();
    await localLocationStore.upsertFromPartialLocation({
      partialLocation: greatWallSourceFixture,
      source: {
        sourcePhotoUris: greatWallSourceFixture.sourcePhotoUris,
      },
      status: 'processing',
    });
    await eventsWriter.enqueuePartialLocation(greatWallSourceFixture);

    const result = await processNextPartialLocations({
      eventsReader,
      locationDirectory,
      localLocationStore,
      recognizer: new FakeLocationRecognizer(),
    });

    expect(result).toEqual({
      acknowledged: 1,
      failed: 0,
      matched: 1,
      processed: 1,
    });
    await expect(locationDirectory.listLocations()).resolves.toMatchObject([
      {
        name: 'Great Wall of China',
        instagramFeedUrl: 'https://www.instagram.com/explore/locations/236834088/great-wall-of-china/',
      },
    ]);
    await expect(localLocationStore.listLocalLocations()).resolves.toMatchObject([
      {
        canonicalLocationId: 'location-1',
        status: 'matched',
      },
    ]);
    await expect(eventsReader.receivePartialLocations(1)).resolves.toEqual([]);
  });
});
