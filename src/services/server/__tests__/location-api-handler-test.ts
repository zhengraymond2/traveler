import type { AddSourceInput, AddSourceResult, EventsWriter, LocationDirectory } from '@/services/contracts';
import type { LocationIntakeService } from '@/services/location-intake';

import { createLocationApiHandler } from '../location-api-handler';

const addSourceResult: AddSourceResult = {
  emittedEvent: null,
  localLocation: {
    addedAt: '2026-06-21T12:00:00.000Z',
    canonicalLocationId: 'location-great-wall',
    id: 'local-location-1',
    lastPartialLocationId: 'partial-1',
    privateDescription: null,
    sourceInstagramUrls: [],
    sourceLinks: [],
    sourcePhotoUris: [],
    status: 'matched',
    updatedAt: '2026-06-21T12:00:00.000Z',
  },
  matchedLocations: [],
  processingCount: 0,
};

describe('location API handler', () => {
  test('POST /sources delegates to LocationIntakeService', async () => {
    const calls: AddSourceInput[] = [];
    const handler = createLocationApiHandler({
      eventsWriter: createEventsWriter(),
      locationDirectory: createLocationDirectory(),
      locationIntakeService: {
        async addSource(input) {
          calls.push(input);
          return addSourceResult;
        },
      },
    });

    const response = await handler(
      new Request('http://127.0.0.1:8787/sources', {
        body: JSON.stringify({ name: 'Great Wall of China' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
    );

    await expect(response.json()).resolves.toEqual(addSourceResult);
    expect(response.status).toBe(200);
    expect(calls).toEqual([{ name: 'Great Wall of China' }]);
  });

  test('POST /partial-locations enqueues an event', async () => {
    const event = {
      createdAt: '2026-06-21T12:00:00.000Z',
      id: 'partial-1',
      name: 'Great Wall of China',
    };
    const enqueued: unknown[] = [];
    const handler = createLocationApiHandler({
      eventsWriter: {
        async enqueuePartialLocation(input) {
          enqueued.push(input);
        },
      },
      locationDirectory: createLocationDirectory(),
      locationIntakeService: createIntakeService(),
    });

    const response = await handler(
      new Request('http://127.0.0.1:8787/partial-locations', {
        body: JSON.stringify(event),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
    );

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(enqueued).toEqual([event]);
  });

  test('POST /sources returns 400 when the source has no recognition clues', async () => {
    const handler = createLocationApiHandler({
      eventsWriter: createEventsWriter(),
      locationDirectory: createLocationDirectory(),
      locationIntakeService: {
        async addSource() {
          throw new Error('PartialLocation must include at least one clue.');
        },
      },
    });

    const response = await handler(
      new Request('http://127.0.0.1:8787/sources', {
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'PartialLocation must include at least one clue.' });
  });

  test('returns 404 for unsupported routes', async () => {
    const handler = createLocationApiHandler({
      eventsWriter: createEventsWriter(),
      locationDirectory: createLocationDirectory(),
      locationIntakeService: createIntakeService(),
    });

    const response = await handler(new Request('http://127.0.0.1:8787/nope'));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Not found.' });
  });

  test('GET /locations returns canonical locations by id', async () => {
    const handler = createLocationApiHandler({
      eventsWriter: createEventsWriter(),
      locationDirectory: createLocationDirectory(),
      locationIntakeService: createIntakeService(),
    });

    const response = await handler(new Request('http://127.0.0.1:8787/locations?ids=location-great-wall'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      {
        allTrailsUrl: null,
        createdAt: '2026-06-21T12:00:00.000Z',
        fieldConfidenceJson: '{"name":1}',
        googleMapsUrl: null,
        id: 'location-great-wall',
        instagramFeedUrl: null,
        latitude: null,
        longitude: null,
        name: 'Great Wall of China',
        updatedAt: '2026-06-21T12:00:00.000Z',
      },
    ]);
  });
});

function createIntakeService(): LocationIntakeService {
  return {
    async addSource() {
      return addSourceResult;
    },
  };
}

function createEventsWriter(): EventsWriter {
  return {
    async enqueuePartialLocation() {
      return undefined;
    },
  };
}

function createLocationDirectory(): LocationDirectory {
  return {
    async getLocationsByIds(ids) {
      return ids.map((id) => ({
        allTrailsUrl: null,
        createdAt: '2026-06-21T12:00:00.000Z',
        fieldConfidenceJson: '{"name":1}',
        googleMapsUrl: null,
        id,
        instagramFeedUrl: null,
        latitude: null,
        longitude: null,
        name: 'Great Wall of China',
        updatedAt: '2026-06-21T12:00:00.000Z',
      }));
    },
    async search() {
      return [];
    },
    async upsertLocation(input) {
      return {
        allTrailsUrl: input.allTrailsUrl,
        createdAt: '2026-06-21T12:00:00.000Z',
        fieldConfidenceJson: JSON.stringify(input.fieldConfidence),
        googleMapsUrl: input.googleMapsUrl,
        id: 'location-great-wall',
        instagramFeedUrl: input.instagramFeedUrl,
        latitude: input.latitude,
        longitude: input.longitude,
        name: input.name,
        updatedAt: '2026-06-21T12:00:00.000Z',
      };
    },
  };
}
