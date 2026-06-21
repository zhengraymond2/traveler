import { createRecognitionTestHarness } from './location-recognition-test-harness';
import { greatWallSourceFixture, greatWallSourcePhotoUri } from '../../fixtures/location-recognition/great-wall-source';

describe('local location recognition flow', () => {
  test('existing DB match emits no event and keeps source evidence locally', async () => {
    const harness = createRecognitionTestHarness({
      canonicalLocations: [
        {
          allTrailsUrl: null,
          createdAt: '2026-06-21T12:00:00.000Z',
          fieldConfidenceJson: JSON.stringify({ name: 0.99 }),
          googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Great%20Wall%20of%20China',
          id: 'location-great-wall',
          instagramFeedUrl: 'https://www.instagram.com/explore/locations/236834088/great-wall-of-china/',
          latitude: 40.4319,
          longitude: 116.5704,
          name: 'Great Wall of China',
          updatedAt: '2026-06-21T12:00:00.000Z',
        },
      ],
    });

    const result = await harness.intake.addSource({
      instagramUrls: ['https://www.instagram.com/p/source-post'],
      name: 'Great Wall of China',
      sourcePhotoUris: [greatWallSourcePhotoUri],
    });

    expect(result.emittedEvent).toBeNull();
    expect(harness.eventsStore.serializedEvents).toEqual([]);
    expect(result.localLocation).toMatchObject({
      canonicalLocationId: 'location-great-wall',
      sourceInstagramUrls: ['https://www.instagram.com/p/source-post'],
      sourcePhotoUris: [greatWallSourcePhotoUri],
      status: 'matched',
    });
  });

  test('new source is pending until the local worker enriches it', async () => {
    const harness = createRecognitionTestHarness();

    const pending = await harness.intake.addSource({
      sourcePhotoUris: [greatWallSourcePhotoUri],
    });

    expect(pending.processingCount).toBe(1);
    expect(harness.eventsStore.serializedEvents).toHaveLength(1);
    await expect(harness.locationDirectory.listLocations()).resolves.toEqual([]);

    await harness.processNext();

    await expect(harness.locationDirectory.listLocations()).resolves.toMatchObject([
      {
        instagramFeedUrl: 'https://www.instagram.com/explore/locations/236834088/great-wall-of-china/',
        name: 'Great Wall of China',
      },
    ]);
    await expect(harness.localLocationStore.listLocalLocations()).resolves.toMatchObject([
      {
        canonicalLocationId: 'location-1',
        status: 'matched',
      },
    ]);
  });

  test('image-only PartialLocation is recognized by the fake worker', async () => {
    const harness = createRecognitionTestHarness();
    await harness.localLocationStore.upsertFromPartialLocation({
      partialLocation: greatWallSourceFixture,
      source: { sourcePhotoUris: greatWallSourceFixture.sourcePhotoUris },
      status: 'processing',
    });
    await harness.eventsWriter.enqueuePartialLocation(greatWallSourceFixture);

    await expect(harness.processNext()).resolves.toMatchObject({
      matched: 1,
      processed: 1,
    });
  });
});
