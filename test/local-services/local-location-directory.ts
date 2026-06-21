import type {
  Location,
  LocationDirectory,
  LocationSearchResult,
  PartialLocation,
  RecognizedLocation,
} from '@/services/contracts';

export class LocalLocationDirectory implements LocationDirectory {
  private locations: Location[];

  constructor(seedLocations: Location[] = []) {
    this.locations = [...seedLocations];
  }

  async search(input: PartialLocation): Promise<LocationSearchResult[]> {
    const results = this.locations
      .map((location) => scoreLocation(input, location))
      .filter((result): result is LocationSearchResult => result !== null)
      .sort((first, second) => second.score - first.score);

    return results;
  }

  async upsertLocation(input: RecognizedLocation): Promise<Location> {
    const existing = this.locations.find((location) => isSameCanonicalLocation(location, input));
    const now = new Date().toISOString();

    if (existing) {
      const updated = mergeLocation(existing, input, now);
      this.locations = this.locations.map((location) => (location.id === existing.id ? updated : location));
      return updated;
    }

    const created: Location = {
      id: `location-${this.locations.length + 1}`,
      name: normalizeNullableText(input.name),
      googleMapsUrl: normalizeNullableText(input.googleMapsUrl),
      latitude: input.latitude,
      longitude: input.longitude,
      allTrailsUrl: normalizeNullableText(input.allTrailsUrl),
      instagramFeedUrl: normalizeNullableText(input.instagramFeedUrl),
      fieldConfidenceJson: JSON.stringify(input.fieldConfidence),
      createdAt: now,
      updatedAt: now,
    };

    this.locations.push(created);
    return created;
  }

  async listLocations(): Promise<Location[]> {
    return [...this.locations];
  }
}

function scoreLocation(input: PartialLocation, location: Location): LocationSearchResult | null {
  const matchedFields: string[] = [];
  let score = 0;

  if (normalizeKey(input.name) && normalizeKey(input.name) === normalizeKey(location.name)) {
    matchedFields.push('name');
    score += 0.7;
  }
  if (input.googleMapsUrl?.trim() && input.googleMapsUrl.trim() === location.googleMapsUrl) {
    matchedFields.push('googleMapsUrl');
    score += 0.9;
  }
  if (
    input.gpsCoordinates &&
    location.latitude != null &&
    location.longitude != null &&
    areCoordinatesClose(input.gpsCoordinates.latitude, location.latitude) &&
    areCoordinatesClose(input.gpsCoordinates.longitude, location.longitude)
  ) {
    matchedFields.push('gpsCoordinates');
    score += 0.8;
  }

  return matchedFields.length ? { location, score: Math.min(1, score), matchedFields } : null;
}

function isSameCanonicalLocation(location: Location, input: RecognizedLocation) {
  const namesMatch = normalizeKey(location.name) && normalizeKey(location.name) === normalizeKey(input.name);
  const coordinatesMatch =
    location.latitude != null &&
    location.longitude != null &&
    input.latitude != null &&
    input.longitude != null &&
    areCoordinatesClose(location.latitude, input.latitude) &&
    areCoordinatesClose(location.longitude, input.longitude);

  return Boolean(namesMatch || coordinatesMatch);
}

function mergeLocation(existing: Location, input: RecognizedLocation, updatedAt: string): Location {
  return {
    ...existing,
    name: existing.name ?? normalizeNullableText(input.name),
    googleMapsUrl: existing.googleMapsUrl ?? normalizeNullableText(input.googleMapsUrl),
    latitude: existing.latitude ?? input.latitude,
    longitude: existing.longitude ?? input.longitude,
    allTrailsUrl: existing.allTrailsUrl ?? normalizeNullableText(input.allTrailsUrl),
    instagramFeedUrl: existing.instagramFeedUrl ?? normalizeNullableText(input.instagramFeedUrl),
    fieldConfidenceJson: JSON.stringify({
      ...parseConfidence(existing.fieldConfidenceJson),
      ...input.fieldConfidence,
    }),
    updatedAt,
  };
}

function parseConfidence(value: string | null) {
  if (!value) {
    return {};
  }

  try {
    return JSON.parse(value) as Record<string, number>;
  } catch {
    return {};
  }
}

function normalizeNullableText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeKey(value: string | null | undefined) {
  return normalizeNullableText(value)?.toLocaleLowerCase() ?? null;
}

function areCoordinatesClose(first: number, second: number) {
  return Math.abs(first - second) <= 0.0001;
}
