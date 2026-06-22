import type { AddSourceInput, AddSourceResult, Location, PartialLocation } from '@/services/contracts';
import type { LocationIntakeService } from '@/services/location-intake';

type FetchLike = (input: string, init?: RequestInit) => Promise<Pick<Response, 'json' | 'ok' | 'status'>>;

export type LocationApiClientOptions = {
  baseUrl: string;
  fetchImpl?: FetchLike;
};

export class LocationApiClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;

  constructor(options: LocationApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async addSource(input: AddSourceInput): Promise<AddSourceResult> {
    return this.post('/sources', input);
  }

  async enqueuePartialLocation(event: PartialLocation): Promise<void> {
    await this.post('/partial-locations', event);
  }

  async getLocationsByIds(ids: string[]): Promise<Location[]> {
    const uniqueIds = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
    if (!uniqueIds.length) {
      return [];
    }

    return this.get(`/locations?ids=${uniqueIds.map(encodeURIComponent).join(',')}`);
  }

  private async get<ResponseBody>(path: string): Promise<ResponseBody> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(await getLocationApiErrorMessage(response));
    }

    return response.json() as Promise<ResponseBody>;
  }

  private async post<ResponseBody>(path: string, body: unknown): Promise<ResponseBody> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(await getLocationApiErrorMessage(response));
    }

    return response.json() as Promise<ResponseBody>;
  }
}

async function getLocationApiErrorMessage(response: Pick<Response, 'json' | 'status'>) {
  const fallback = `Location API request failed with HTTP ${response.status}.`;

  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body.error === 'string' && body.error.trim() ? body.error : fallback;
  } catch {
    return fallback;
  }
}

export function createRemoteLocationIntakeService(client: LocationApiClient): LocationIntakeService {
  return {
    addSource(input) {
      return client.addSource(input);
    },
  };
}
