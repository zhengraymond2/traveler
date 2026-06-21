import { createLocationIntakeService } from '../location-intake-service';
import { createLocalEventsStore, LocalEventsWriter } from '../../../../test/local-services/local-events';
import { LocalLocationDirectory } from '../../../../test/local-services/local-location-directory';
import { LocalLocalLocationStore } from '../../../../test/local-services/local-local-location-store';
import { greatWallSourcePhotoUri } from '../../../../test/fixtures/location-recognition/great-wall-source';

describe('location intake service', () => {
  test('matched source creates a linked local record and emits no event', async () => {
    const eventsStore = createLocalEventsStore();
    const localLocationStore = new LocalLocalLocationStore();
    const directory = new LocalLocationDirectory([
      {
        id: 'location-great-wall',
        name: 'Great Wall of China',
        googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Great%20Wall%20of%20China',
        latitude: 40.4319,
        longitude: 116.5704,
        allTrailsUrl: null,
        instagramFeedUrl: 'https://www.instagram.com/explore/locations/236834088/great-wall-of-china/',
        fieldConfidenceJson: JSON.stringify({ name: 0.99 }),
        createdAt: '2026-06-21T12:00:00.000Z',
        updatedAt: '2026-06-21T12:00:00.000Z',
      },
    ]);
    const service = createLocationIntakeService({
      createId: () => 'partial-1',
      eventsWriter: new LocalEventsWriter(eventsStore),
      locationDirectory: directory,
      localLocationStore,
      now: () => new Date('2026-06-21T12:00:00.000Z'),
    });

    const result = await service.addSource({
      name: 'Great Wall of China',
      sourcePhotoUris: [greatWallSourcePhotoUri],
    });

    expect(result.emittedEvent).toBeNull();
    expect(result.processingCount).toBe(0);
    expect(result.matchedLocations).toHaveLength(1);
    expect(result.localLocation).toMatchObject({
      canonicalLocationId: 'location-great-wall',
      status: 'matched',
      sourcePhotoUris: [greatWallSourcePhotoUri],
      lastPartialLocationId: 'partial-1',
    });
    expect(eventsStore.serializedEvents).toEqual([]);
  });

  test('unmatched image-only source creates a processing local record and emits one event', async () => {
    const eventsStore = createLocalEventsStore();
    const service = createLocationIntakeService({
      createId: () => 'partial-1',
      eventsWriter: new LocalEventsWriter(eventsStore),
      locationDirectory: new LocalLocationDirectory(),
      localLocationStore: new LocalLocalLocationStore(),
      now: () => new Date('2026-06-21T12:00:00.000Z'),
    });

    const result = await service.addSource({
      sourcePhotoUris: [greatWallSourcePhotoUri],
    });

    expect(result.processingCount).toBe(1);
    expect(result.matchedLocations).toEqual([]);
    expect(result.localLocation).toMatchObject({
      canonicalLocationId: null,
      status: 'processing',
      sourcePhotoUris: [greatWallSourcePhotoUri],
    });
    expect(result.emittedEvent).toEqual({
      id: 'partial-1',
      sourcePhotoUris: [greatWallSourcePhotoUri],
      createdAt: '2026-06-21T12:00:00.000Z',
    });
    expect(eventsStore.serializedEvents).toEqual([JSON.stringify(result.emittedEvent)]);
  });

  test('duplicate local source appends new photos and links to one local record', async () => {
    const localLocationStore = new LocalLocalLocationStore();
    const service = createLocationIntakeService({
      createId: jest.fn().mockReturnValueOnce('partial-1').mockReturnValueOnce('partial-2'),
      eventsWriter: new LocalEventsWriter(createLocalEventsStore()),
      locationDirectory: new LocalLocationDirectory(),
      localLocationStore,
      now: () => new Date('2026-06-21T12:00:00.000Z'),
    });

    await service.addSource({
      sourcePhotoUris: ['file:///first.jpg'],
      instagramUrls: ['https://www.instagram.com/p/source-post'],
      privateDescription: 'First note',
    });
    const secondResult = await service.addSource({
      sourcePhotoUris: ['file:///second.jpg'],
      instagramUrls: ['https://www.instagram.com/p/source-post'],
      googleMapsUrl: 'https://maps.google.com/?q=Great+Wall',
      privateDescription: 'Second note',
    });

    await expect(localLocationStore.listLocalLocations()).resolves.toHaveLength(1);
    expect(secondResult.localLocation.sourcePhotoUris).toEqual(['file:///first.jpg', 'file:///second.jpg']);
    expect(secondResult.localLocation.sourceLinks).toEqual([
      'https://www.instagram.com/p/source-post',
      'https://maps.google.com/?q=Great+Wall',
    ]);
    expect(secondResult.localLocation.privateDescription).toBe('First note\n\nSecond note');
  });
});
