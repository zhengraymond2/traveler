import {
  assertValidPartialLocation,
  type LocalLocation,
  type Location,
  type PartialLocation,
} from '../location-types';

describe('location recognition contract types', () => {
  test('accepts a PartialLocation with only source photos', () => {
    const partialLocation: PartialLocation = {
      id: 'partial-1',
      sourcePhotoUris: ['file:///great-wall.jpg'],
      createdAt: '2026-06-21T12:00:00.000Z',
    };

    expect(() => assertValidPartialLocation(partialLocation)).not.toThrow();
  });

  test('rejects a PartialLocation with no location clues', () => {
    const partialLocation: PartialLocation = {
      id: 'partial-1',
      createdAt: '2026-06-21T12:00:00.000Z',
    };

    expect(() => assertValidPartialLocation(partialLocation)).toThrow('PartialLocation must include at least one clue.');
  });

  test('canonical Location includes instagramFeedUrl', () => {
    const location: Location = {
      id: 'location-1',
      name: 'Great Wall of China',
      googleMapsUrl: null,
      latitude: 40.4319,
      longitude: 116.5704,
      allTrailsUrl: null,
      instagramFeedUrl: 'https://www.instagram.com/explore/locations/236834088/great-wall-of-china/',
      fieldConfidenceJson: JSON.stringify({ name: 0.99 }),
      createdAt: '2026-06-21T12:00:00.000Z',
      updatedAt: '2026-06-21T12:00:00.000Z',
    };

    expect(location.instagramFeedUrl).toContain('/explore/locations/');
    expect('sourcePhotoUris' in location).toBe(false);
  });

  test('source photos belong to LocalLocation', () => {
    const localLocation: LocalLocation = {
      id: 'local-location-1',
      canonicalLocationId: null,
      status: 'processing',
      sourcePhotoUris: ['file:///great-wall.jpg'],
      sourceLinks: [],
      sourceInstagramUrls: [],
      privateDescription: null,
      lastPartialLocationId: 'partial-1',
      addedAt: '2026-06-21T12:00:00.000Z',
      updatedAt: '2026-06-21T12:00:00.000Z',
    };

    expect(localLocation.sourcePhotoUris).toEqual(['file:///great-wall.jpg']);
  });
});
