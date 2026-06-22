import { loadOpenRouterConfigFromEnv } from '@/services/location-recognizers';

describe('AWS worker dependency config', () => {
  test('OpenRouter worker config requires API key and model', () => {
    expect(() => loadOpenRouterConfigFromEnv({})).toThrow(
      'Missing OpenRouter env vars: OPENROUTER_API_KEY, OPENROUTER_MODEL'
    );
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
});
