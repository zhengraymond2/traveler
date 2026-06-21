import type { LocationRecognizer, PartialLocation, RecognizedLocationResult } from '@/services/contracts';

export const greatWallFixturePhotoUri = 'file:///fixtures/great-wall-of-china.jpg';

export function createFixtureLocationRecognizer(): LocationRecognizer {
  return {
    async recognize(input: PartialLocation): Promise<RecognizedLocationResult> {
      if (input.sourcePhotoUris?.includes(greatWallFixturePhotoUri)) {
        return {
          kind: 'recognized',
          location: {
            allTrailsUrl: null,
            fieldConfidence: {
              googleMapsUrl: 0.9,
              gpsCoordinates: 0.92,
              instagramFeedUrl: 0.95,
              name: 0.99,
            },
            googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Great%20Wall%20of%20China',
            instagramFeedUrl: 'https://www.instagram.com/explore/locations/236834088/great-wall-of-china/',
            latitude: 40.4319,
            longitude: 116.5704,
            name: 'Great Wall of China',
          },
        };
      }

      return {
        kind: 'failed',
        reason: 'Fixture recognizer has no match for this partial location.',
      };
    },
  };
}
