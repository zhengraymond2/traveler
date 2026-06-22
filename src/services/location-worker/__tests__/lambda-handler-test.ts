import type { RecognizedLocation } from '@/services/contracts';

import { createLocationRecognitionLambdaHandler } from '../lambda-handler';

const sqsEvent = {
  Records: [
    {
      body: JSON.stringify({
        createdAt: '2026-06-22T12:00:00.000Z',
        id: 'partial-1',
        name: 'Great Wall of China',
      }),
      messageId: 'message-1',
    },
  ],
};

const multiRecordEvent = {
  Records: [
    {
      body: JSON.stringify({
        createdAt: '2026-06-22T12:00:00.000Z',
        id: 'partial-1',
        name: 'Great Wall of China',
      }),
      messageId: 'message-1',
    },
    {
      body: JSON.stringify({
        createdAt: '2026-06-22T12:05:00.000Z',
        id: 'partial-2',
        name: 'Throw Me',
      }),
      messageId: 'message-2',
    },
    {
      body: JSON.stringify({
        createdAt: '2026-06-22T12:10:00.000Z',
        id: 'partial-3',
        name: 'Machu Picchu',
      }),
      messageId: 'message-3',
    },
  ],
};

describe('location recognition lambda handler', () => {
  test('returns no batch failures when a record is processed', async () => {
    const handler = createLocationRecognitionLambdaHandler(async () => ({
      locationDirectory: {
        async getLocationsByIds() {
          return [];
        },
        async search() {
          return [];
        },
        async upsertLocation(input: RecognizedLocation) {
          return {
            allTrailsUrl: input.allTrailsUrl,
            createdAt: '2026-06-22T12:00:00.000Z',
            fieldConfidenceJson: JSON.stringify(input.fieldConfidence),
            googleMapsUrl: input.googleMapsUrl,
            id: 'location-1',
            instagramFeedUrl: input.instagramFeedUrl,
            latitude: input.latitude,
            longitude: input.longitude,
            name: input.name,
            updatedAt: '2026-06-22T12:00:00.000Z',
          };
        },
      },
      localLocationStore: {
        async findByPartialLocation() {
          return null;
        },
        async linkCanonicalLocation() {
          return undefined;
        },
        async updateStatus() {
          return undefined;
        },
        async upsertFromPartialLocation() {
          throw new Error('upsertFromPartialLocation should not be called by Lambda worker.');
        },
      },
      recognizer: {
        async recognize() {
          return {
            kind: 'recognized',
            location: {
              allTrailsUrl: null,
              fieldConfidence: { name: 0.99 },
              googleMapsUrl: null,
              instagramFeedUrl: null,
              latitude: null,
              longitude: null,
              name: 'Great Wall of China',
            },
          };
        },
      },
    }));

    await expect(handler(sqsEvent)).resolves.toEqual({ batchItemFailures: [] });
  });

  test('returns partial batch failure for retryable recognizer failure', async () => {
    const handler = createLocationRecognitionLambdaHandler(async () => ({
      locationDirectory: {
        async getLocationsByIds() {
          return [];
        },
        async search() {
          return [];
        },
        async upsertLocation() {
          throw new Error('upsertLocation should not be called for recognizer failure.');
        },
      },
      localLocationStore: {
        async findByPartialLocation() {
          return null;
        },
        async linkCanonicalLocation() {
          return undefined;
        },
        async updateStatus() {
          return undefined;
        },
        async upsertFromPartialLocation() {
          throw new Error('upsertFromPartialLocation should not be called by Lambda worker.');
        },
      },
      recognizer: {
        async recognize() {
          return { kind: 'failed', reason: 'OpenRouter returned invalid location JSON.' };
        },
      },
    }));

    await expect(handler(sqsEvent)).resolves.toEqual({
      batchItemFailures: [{ itemIdentifier: 'message-1' }],
    });
  });

  test('returns a partial batch failure when processing throws for one record and continues with the rest', async () => {
    const recognizedNames: string[] = [];
    const upsertedNames: string[] = [];
    const handler = createLocationRecognitionLambdaHandler(async () => ({
      locationDirectory: {
        async getLocationsByIds() {
          return [];
        },
        async search() {
          return [];
        },
        async upsertLocation(input: RecognizedLocation) {
          const locationName = input.name ?? 'unknown';
          upsertedNames.push(locationName);
          return {
            allTrailsUrl: input.allTrailsUrl,
            createdAt: '2026-06-22T12:00:00.000Z',
            fieldConfidenceJson: JSON.stringify(input.fieldConfidence),
            googleMapsUrl: input.googleMapsUrl,
            id: `location-${locationName}`,
            instagramFeedUrl: input.instagramFeedUrl,
            latitude: input.latitude,
            longitude: input.longitude,
            name: input.name,
            updatedAt: '2026-06-22T12:00:00.000Z',
          };
        },
      },
      localLocationStore: {
        async findByPartialLocation() {
          return null;
        },
        async linkCanonicalLocation() {
          return undefined;
        },
        async updateStatus() {
          return undefined;
        },
        async upsertFromPartialLocation() {
          throw new Error('upsertFromPartialLocation should not be called by Lambda worker.');
        },
      },
      recognizer: {
        async recognize(partialLocation) {
          const partialLocationName = partialLocation.name ?? null;

          recognizedNames.push(partialLocationName ?? '<missing>');

          if (partialLocationName === 'Throw Me') {
            throw new Error('transient recognizer failure');
          }

          return {
            kind: 'recognized',
            location: {
              allTrailsUrl: null,
              fieldConfidence: { name: 0.99 },
              googleMapsUrl: null,
              instagramFeedUrl: null,
              latitude: null,
              longitude: null,
              name: partialLocationName,
            },
          };
        },
      },
    }));

    await expect(handler(multiRecordEvent)).resolves.toEqual({
      batchItemFailures: [{ itemIdentifier: 'message-2' }],
    });
    expect(recognizedNames).toEqual(['Great Wall of China', 'Throw Me', 'Machu Picchu']);
    expect(upsertedNames).toEqual(['Great Wall of China', 'Machu Picchu']);
  });

  test('returns partial batch failure for malformed JSON', async () => {
    const handler = createLocationRecognitionLambdaHandler(async () => {
      throw new Error('deps should not be created for malformed JSON.');
    });

    await expect(
      handler({
        Records: [{ body: '{', messageId: 'message-1' }],
      })
    ).resolves.toEqual({
      batchItemFailures: [{ itemIdentifier: 'message-1' }],
    });
  });
});
