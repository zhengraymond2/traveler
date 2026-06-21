import type { PartialLocation } from '@/services/contracts';

import {
  createLocalEventsStore,
  LocalEventsReader,
  LocalEventsWriter,
} from '../local-events';
import { FakeLocationRecognizer } from '../fake-location-recognizer';
import { LocalLocationDirectory } from '../local-location-directory';
import { greatWallSourceFixture } from '../../fixtures/location-recognition/great-wall-source';

describe('local recognition services', () => {
  test('local events serialize and receive queued partial locations', async () => {
    const store = createLocalEventsStore();
    const writer = new LocalEventsWriter(store);
    const reader = new LocalEventsReader(store);
    const partialLocation: PartialLocation = {
      id: 'partial-1',
      sourcePhotoUris: ['file:///great-wall.jpg'],
      createdAt: '2026-06-21T12:00:00.000Z',
    };

    await writer.enqueuePartialLocation(partialLocation);

    expect(store.serializedEvents).toEqual([JSON.stringify(partialLocation)]);
    await expect(reader.receivePartialLocations(1)).resolves.toMatchObject([
      {
        event: partialLocation,
        receiveCount: 1,
      },
    ]);
  });

  test('local event ack prevents redelivery', async () => {
    const store = createLocalEventsStore();
    const writer = new LocalEventsWriter(store);
    const reader = new LocalEventsReader(store);
    await writer.enqueuePartialLocation({
      id: 'partial-1',
      sourcePhotoUris: ['file:///great-wall.jpg'],
      createdAt: '2026-06-21T12:00:00.000Z',
    });

    const [message] = await reader.receivePartialLocations(1);
    await reader.ack(message.messageId);

    await expect(reader.receivePartialLocations(1)).resolves.toEqual([]);
  });

  test('fake recognizer maps the Great Wall source image to canonical data', async () => {
    const recognizer = new FakeLocationRecognizer();

    await expect(recognizer.recognize(greatWallSourceFixture)).resolves.toEqual({
      kind: 'recognized',
      location: {
        name: 'Great Wall of China',
        googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Great%20Wall%20of%20China',
        latitude: 40.4319,
        longitude: 116.5704,
        allTrailsUrl: null,
        instagramFeedUrl: 'https://www.instagram.com/explore/locations/236834088/great-wall-of-china/',
        fieldConfidence: {
          name: 0.99,
          googleMapsUrl: 0.9,
          gpsCoordinates: 0.92,
          instagramFeedUrl: 0.95,
        },
      },
    });
  });

  test('local location directory dedupes canonical locations by name and coordinates', async () => {
    const directory = new LocalLocationDirectory();

    const first = await directory.upsertLocation({
      name: 'Great Wall of China',
      googleMapsUrl: null,
      latitude: 40.4319,
      longitude: 116.5704,
      allTrailsUrl: null,
      instagramFeedUrl: 'https://www.instagram.com/explore/locations/236834088/great-wall-of-china/',
      fieldConfidence: { name: 0.99 },
    });
    const second = await directory.upsertLocation({
      name: '  great wall of china  ',
      googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Great%20Wall%20of%20China',
      latitude: 40.43191,
      longitude: 116.57039,
      allTrailsUrl: null,
      instagramFeedUrl: null,
      fieldConfidence: { googleMapsUrl: 0.9 },
    });

    expect(second.id).toBe(first.id);
    expect(second.name).toBe('Great Wall of China');
    expect(second.googleMapsUrl).toBe('https://www.google.com/maps/search/?api=1&query=Great%20Wall%20of%20China');
    expect(second.instagramFeedUrl).toBe('https://www.instagram.com/explore/locations/236834088/great-wall-of-china/');
    await expect(directory.listLocations()).resolves.toHaveLength(1);
  });
});
