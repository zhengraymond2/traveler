import type { Location, LocationPhoto } from '@/db/schema';
import type { LocationWithPhotos } from '@/db/repository';

type LocationOverrides = Partial<Location>;
type LocationPhotoOverrides = Partial<LocationPhoto>;

const baseDate = new Date('2026-01-01T00:00:00.000Z');

export const DbTestHelper = {
  location(overrides: LocationOverrides = {}): Location {
    return {
      id: 'location-1',
      name: 'Mount Baker',
      latitude: 48.7768,
      longitude: -121.8144,
      googleMapsUrl: null,
      instagramUrl: null,
      trailMapUrl: null,
      notes: null,
      country: 'PNW',
      category: 'hiking',
      createdAt: baseDate,
      updatedAt: baseDate,
      ...overrides,
    };
  },

  locationPhoto(overrides: LocationPhotoOverrides = {}): LocationPhoto {
    return {
      id: 'photo-1',
      locationId: 'location-1',
      uri: 'file:///photo.jpg',
      caption: null,
      createdAt: baseDate,
      ...overrides,
    };
  },

  locationWithPhotos(overrides: LocationOverrides & { photos?: LocationPhoto[] } = {}): LocationWithPhotos {
    const { photos = [], ...locationOverrides } = overrides;
    return {
      ...this.location(locationOverrides),
      photos,
    };
  },
};
