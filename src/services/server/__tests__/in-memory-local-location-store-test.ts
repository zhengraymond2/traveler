import { InMemoryLocalLocationStore } from '../in-memory-local-location-store';

describe('InMemoryLocalLocationStore', () => {
  test('creates processing local locations and dedupes repeated source links', async () => {
    const store = new InMemoryLocalLocationStore({
      now: () => new Date('2026-06-21T12:00:00.000Z'),
    });
    const partialLocation = {
      createdAt: '2026-06-21T12:00:00.000Z',
      googleMapsUrl: 'https://maps.example/great-wall',
      id: 'partial-1',
      name: 'Great Wall of China',
    };

    const created = await store.upsertFromPartialLocation({
      partialLocation,
      source: { googleMapsUrl: partialLocation.googleMapsUrl },
      status: 'processing',
    });
    const updated = await store.upsertFromPartialLocation({
      canonicalLocationId: 'location-great-wall',
      partialLocation: { ...partialLocation, id: 'partial-2' },
      source: { googleMapsUrl: partialLocation.googleMapsUrl },
      status: 'matched',
    });

    expect(created.id).toBe('local-location-1');
    expect(updated).toMatchObject({
      canonicalLocationId: 'location-great-wall',
      id: 'local-location-1',
      lastPartialLocationId: 'partial-2',
      sourceLinks: ['https://maps.example/great-wall'],
      status: 'matched',
    });
  });
});
