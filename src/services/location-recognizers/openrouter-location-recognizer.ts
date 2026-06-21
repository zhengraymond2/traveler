import type {
  LocationRecognizer,
  PartialLocation,
  RecognitionConfidence,
  RecognizedLocation,
  RecognizedLocationResult,
} from '@/services/contracts';

type FetchLike = (input: string, init?: RequestInit) => Promise<Pick<Response, 'json' | 'ok' | 'status'>>;

export type OpenRouterConfig = {
  apiKey: string;
  appTitle?: string;
  baseUrl?: string;
  model: string;
  siteUrl?: string;
};

type OpenRouterLocationJson = Partial<{
  allTrailsUrl: string | null;
  confidence: RecognitionConfidence;
  googleMapsUrl: string | null;
  instagramFeedUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  name: string | null;
}>;

const defaultBaseUrl = 'https://openrouter.ai/api/v1';
const nameConfidenceThreshold = 0.8;

export function createOpenRouterLocationRecognizer(config: OpenRouterConfig, fetchImpl: FetchLike = fetch): LocationRecognizer {
  return {
    async recognize(input) {
      const response = await fetchImpl(`${config.baseUrl ?? defaultBaseUrl}/chat/completions`, {
        body: JSON.stringify(buildOpenRouterRequest(config, input)),
        headers: buildHeaders(config),
        method: 'POST',
      });
      if (!response.ok) {
        return {
          kind: 'failed',
          reason: `OpenRouter request failed with HTTP ${response.status}.`,
        };
      }

      const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = body.choices?.[0]?.message?.content;
      if (!content) {
        return {
          kind: 'failed',
          reason: 'OpenRouter returned no message content.',
        };
      }

      const parsed = parseLocationJson(content);
      if (!parsed) {
        return {
          kind: 'failed',
          reason: 'OpenRouter returned invalid location JSON.',
        };
      }

      const location = toRecognizedLocation(parsed);
      if ((location.fieldConfidence.name ?? 0) < nameConfidenceThreshold) {
        return {
          kind: 'needsReview',
          location,
          reason: 'OpenRouter returned a low-confidence location name.',
        };
      }

      return {
        kind: 'recognized',
        location,
      };
    },
  };
}

export function loadOpenRouterConfigFromEnv(env: Record<string, string | undefined>): OpenRouterConfig {
  const missing = ['OPENROUTER_API_KEY', 'OPENROUTER_MODEL'].filter((name) => !env[name]?.trim());
  if (missing.length) {
    throw new Error(`Missing OpenRouter env vars: ${missing.join(', ')}`);
  }

  return {
    apiKey: env.OPENROUTER_API_KEY as string,
    appTitle: env.OPENROUTER_APP_TITLE,
    baseUrl: env.OPENROUTER_BASE_URL,
    model: env.OPENROUTER_MODEL as string,
    siteUrl: env.OPENROUTER_SITE_URL,
  };
}

function buildOpenRouterRequest(config: OpenRouterConfig, input: PartialLocation) {
  return {
    max_tokens: 1200,
    messages: [
      {
        content: 'You identify travel locations from partial evidence and return only valid JSON.',
        role: 'system',
      },
      {
        content: buildUserContent(input),
        role: 'user',
      },
    ],
    model: config.model,
    response_format: { type: 'json_object' },
    temperature: 0,
  };
}

function buildHeaders(config: OpenRouterConfig) {
  return {
    Authorization: `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json',
    ...(config.siteUrl ? { 'HTTP-Referer': config.siteUrl } : {}),
    ...(config.appTitle ? { 'X-Title': config.appTitle } : {}),
  };
}

function buildUserContent(input: PartialLocation) {
  const prompt = input.name?.trim()
    ? `Find the missing canonical Location fields for "${input.name}".`
    : 'Here is partial information about a location. Identify the most likely canonical place name and fill out the Location fields.';
  const text = `${prompt}

Return JSON with this exact shape:
{
  "name": string | null,
  "googleMapsUrl": string | null,
  "latitude": number | null,
  "longitude": number | null,
  "allTrailsUrl": string | null,
  "instagramFeedUrl": string | null,
  "confidence": {
    "name": number,
    "googleMapsUrl": number,
    "gpsCoordinates": number,
    "allTrailsUrl": number,
    "instagramFeedUrl": number
  }
}

Confidence scores must be floats from 0.0 to 1.0. Scores over 0.8 mean very certain. Scores under 0.8 mean the user should manually verify.

PartialLocation:
${JSON.stringify(input, null, 2)}`;

  return [
    {
      text,
      type: 'text',
    },
    ...(input.sourcePhotoUris ?? []).map((uri) => ({
      image_url: {
        url: uri,
      },
      type: 'image_url',
    })),
  ];
}

function parseLocationJson(content: string): OpenRouterLocationJson | null {
  try {
    return JSON.parse(content) as OpenRouterLocationJson;
  } catch {
    return null;
  }
}

function toRecognizedLocation(input: OpenRouterLocationJson): RecognizedLocation {
  return {
    allTrailsUrl: normalizeNullableString(input.allTrailsUrl),
    fieldConfidence: input.confidence ?? {},
    googleMapsUrl: normalizeNullableString(input.googleMapsUrl),
    instagramFeedUrl: normalizeNullableString(input.instagramFeedUrl),
    latitude: normalizeNullableNumber(input.latitude),
    longitude: normalizeNullableNumber(input.longitude),
    name: normalizeNullableString(input.name),
  };
}

function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  return value.trim() || null;
}

function normalizeNullableNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return value;
}
