import { createOpenRouterLocationRecognizer, loadOpenRouterConfigFromEnv } from '../openrouter-location-recognizer';

describe('OpenRouterLocationRecognizer', () => {
  test('loads OpenRouter config from env', () => {
    expect(
      loadOpenRouterConfigFromEnv({
        OPENROUTER_API_KEY: 'key',
        OPENROUTER_MODEL: 'google/gemini-2.5-flash',
      })
    ).toMatchObject({
      apiKey: 'key',
      model: 'google/gemini-2.5-flash',
    });
  });

  test('sends multimodal prompt and parses recognized JSON response', async () => {
    const fetchCalls: { body: Record<string, unknown>; headers: Record<string, string>; url: string }[] = [];
    const recognizer = createOpenRouterLocationRecognizer(
      {
        apiKey: 'key',
        model: 'google/gemini-2.5-flash',
      },
      async (url, init) => {
        fetchCalls.push({
          body: JSON.parse(String(init?.body)),
          headers: init?.headers as Record<string, string>,
          url: String(url),
        });
        return {
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    allTrailsUrl: null,
                    confidence: {
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
                  }),
                },
              },
            ],
          }),
          ok: true,
          status: 200,
        };
      }
    );

    await expect(
      recognizer.recognize({
        createdAt: '2026-06-21T12:00:00.000Z',
        id: 'partial-1',
        sourcePhotoUris: ['https://example.com/great-wall.jpg'],
      })
    ).resolves.toMatchObject({
      kind: 'recognized',
      location: {
        name: 'Great Wall of China',
      },
    });
    expect(fetchCalls[0].url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(fetchCalls[0].headers.Authorization).toBe('Bearer key');
    expect(fetchCalls[0].body).toMatchObject({
      model: 'google/gemini-2.5-flash',
      response_format: { type: 'json_object' },
    });
    expect(JSON.stringify(fetchCalls[0].body)).toContain('image_url');
  });

  test('returns needsReview when name confidence is low', async () => {
    const recognizer = createOpenRouterLocationRecognizer(
      {
        apiKey: 'key',
        model: 'google/gemini-2.5-flash',
      },
      async () => ({
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  confidence: { name: 0.5 },
                  name: 'Possible Place',
                }),
              },
            },
          ],
        }),
        ok: true,
        status: 200,
      })
    );

    await expect(
      recognizer.recognize({
        createdAt: '2026-06-21T12:00:00.000Z',
        id: 'partial-1',
        textCaption: 'somewhere pretty',
      })
    ).resolves.toMatchObject({
      kind: 'needsReview',
      reason: 'OpenRouter returned a low-confidence location name.',
    });
  });
});
