import type { LocationRecognizer, PartialLocation, RecognizedLocationResult } from '@/services/contracts';

import { greatWallSourcePhotoUri } from '../fixtures/location-recognition/great-wall-source';

export class FakeLocationRecognizer implements LocationRecognizer {
  async recognize(input: PartialLocation): Promise<RecognizedLocationResult> {
    if (input.sourcePhotoUris?.includes(greatWallSourcePhotoUri)) {
      return {
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
      };
    }

    return {
      kind: 'failed',
      reason: 'FakeLocationRecognizer has no fixture for this partial location.',
    };
  }
}
