import type {
  DatabaseClient,
  DatabaseParameters,
  DatabaseRow,
  Location,
  LocationDirectory,
  LocationSearchResult,
  PartialLocation,
  RecognizedLocation,
  UpsertLocationOptions,
} from '@/services/contracts';
import { canonicalizeInstagramUrls } from '@/services/location-links';

export type SqlLocationDirectoryOptions = {
  coordinateToleranceDegrees?: number;
  createId?: (input: RecognizedLocation) => string;
  limit?: number;
  now?: () => Date;
};

const defaultLimit = 10;
const defaultCoordinateToleranceDegrees = 0.02;

export class SqlLocationDirectory implements LocationDirectory {
  private readonly coordinateToleranceDegrees: number;
  private readonly createId: (input: RecognizedLocation) => string;
  private readonly limit: number;
  private readonly now: () => Date;

  constructor(
    private readonly database: DatabaseClient,
    options: SqlLocationDirectoryOptions = {}
  ) {
    this.coordinateToleranceDegrees = options.coordinateToleranceDegrees ?? defaultCoordinateToleranceDegrees;
    this.createId = options.createId ?? createLocationId;
    this.limit = options.limit ?? defaultLimit;
    this.now = options.now ?? (() => new Date());
  }

  async search(input: PartialLocation): Promise<LocationSearchResult[]> {
    const query = buildSearchQuery(input, this.coordinateToleranceDegrees, this.limit);
    if (!query) {
      return [];
    }

    const result = await this.database.execute(query);
    return result.rows
      .map((row) => {
        const location = mapLocationRow(row);
        return {
          location,
          matchedFields: getMatchedFields(location, input, this.coordinateToleranceDegrees, row),
          score: scoreLocation(location, input, this.coordinateToleranceDegrees, row),
        };
      })
      .filter((match) => match.matchedFields.length > 0)
      .sort((left, right) => right.score - left.score);
  }

  async upsertLocation(input: RecognizedLocation, options: UpsertLocationOptions = {}): Promise<Location> {
    const now = this.now().toISOString();
    const parameters = {
      fieldConfidenceJson: JSON.stringify(input.fieldConfidence),
      googleMapsUrl: input.googleMapsUrl,
      id: this.createId(input),
      instagramFeedUrl: input.instagramFeedUrl,
      latitude: input.latitude,
      longitude: input.longitude,
      name: input.name,
      now,
      trailMapUrl: input.allTrailsUrl,
    };
    const sourceInstagramLinks = buildSourceInstagramLinks(options.partialLocation?.instagramUrls);
    const upsertStatement = {
      sql: `
        insert into locations (
          id,
          name,
          google_maps_url,
          latitude,
          longitude,
          trail_map_url,
          instagram_feed_url,
          field_confidence_json,
          created_at,
          updated_at
        )
        values (
          :id,
          :name,
          :googleMapsUrl,
          :latitude,
          :longitude,
          :trailMapUrl,
          :instagramFeedUrl,
          :fieldConfidenceJson,
          cast(:now as timestamptz),
          cast(:now as timestamptz)
        )
        on conflict (id) do update set
          name = coalesce(excluded.name, locations.name),
          google_maps_url = coalesce(excluded.google_maps_url, locations.google_maps_url),
          latitude = coalesce(excluded.latitude, locations.latitude),
          longitude = coalesce(excluded.longitude, locations.longitude),
          trail_map_url = coalesce(excluded.trail_map_url, locations.trail_map_url),
          instagram_feed_url = coalesce(excluded.instagram_feed_url, locations.instagram_feed_url),
          field_confidence_json = excluded.field_confidence_json,
          updated_at = excluded.updated_at
        returning
          id,
          name,
          google_maps_url,
          latitude,
          longitude,
          trail_map_url,
          instagram_feed_url,
          field_confidence_json,
          created_at,
          updated_at
      `,
      parameters,
    };

    if (sourceInstagramLinks.length) {
      return this.database.transaction(async (transaction) => {
        const location = mapLocationRow(
          (await transaction.execute(upsertStatement)).rows[0] ?? fallbackLocationRow(parameters, now)
        );
        for (const link of sourceInstagramLinks) {
          await transaction.execute(buildInsertInstagramLinkStatement(location.id, link, now));
        }
        return location;
      });
    }

    const result = await this.database.execute(upsertStatement);

    return mapLocationRow(result.rows[0] ?? fallbackLocationRow(parameters, now));
  }
}

function buildSearchQuery(
  input: PartialLocation,
  coordinateToleranceDegrees: number,
  limit: number
): { sql: string; parameters: DatabaseParameters } | null {
  const clauses: string[] = [];
  const parameters: DatabaseParameters = {
    limit,
  };
  const instagramUrls = canonicalizeInstagramUrls(input.instagramUrls);
  const normalizedName = normalizeText(input.name);
  if (normalizedName) {
    clauses.push('lower(name) = :normalizedName');
    parameters.normalizedName = normalizedName;
  }

  const googleMapsUrl = input.googleMapsUrl?.trim();
  if (googleMapsUrl) {
    clauses.push('google_maps_url = :googleMapsUrl');
    parameters.googleMapsUrl = googleMapsUrl;
  }

  if (input.gpsCoordinates) {
    clauses.push('(latitude between :minLatitude and :maxLatitude and longitude between :minLongitude and :maxLongitude)');
    parameters.minLatitude = input.gpsCoordinates.latitude - coordinateToleranceDegrees;
    parameters.maxLatitude = input.gpsCoordinates.latitude + coordinateToleranceDegrees;
    parameters.minLongitude = input.gpsCoordinates.longitude - coordinateToleranceDegrees;
    parameters.maxLongitude = input.gpsCoordinates.longitude + coordinateToleranceDegrees;
  }

  if (instagramUrls.length) {
    const placeholders = instagramUrls.map((url, index) => {
      const parameterName = `instagramUrl${index}`;
      parameters[parameterName] = url;
      return `:${parameterName}`;
    });
    clauses.push(
      `exists (
        select 1
        from location_instagram_links
        where location_instagram_links.location_id = locations.id
          and location_instagram_links.canonical_url in (${placeholders.join(', ')})
      )`
    );
  }

  if (!clauses.length) {
    return null;
  }

  const matchedInstagramUrlSelect = instagramUrls.length
    ? `
        (
          select location_instagram_links.canonical_url
          from location_instagram_links
          where location_instagram_links.location_id = locations.id
            and location_instagram_links.canonical_url in (${instagramUrls.map((_, index) => `:instagramUrl${index}`).join(', ')})
          limit 1
        ) as matched_instagram_url,
      `
    : 'null as matched_instagram_url,';

  return {
    sql: `
      select
        id,
        name,
        google_maps_url,
        latitude,
        longitude,
        trail_map_url,
        instagram_feed_url,
        ${matchedInstagramUrlSelect}
        field_confidence_json,
        created_at,
        updated_at
      from locations
      where ${clauses.join(' or ')}
      limit :limit
    `,
    parameters,
  };
}

function mapLocationRow(row: DatabaseRow): Location {
  return {
    allTrailsUrl: nullableString(row.trail_map_url ?? row.all_trails_url),
    createdAt: toIsoDateString(row.created_at),
    fieldConfidenceJson: nullableString(row.field_confidence_json),
    googleMapsUrl: nullableString(row.google_maps_url),
    id: String(row.id),
    instagramFeedUrl: nullableString(row.instagram_feed_url),
    latitude: nullableNumber(row.latitude),
    longitude: nullableNumber(row.longitude),
    name: nullableString(row.name),
    updatedAt: toIsoDateString(row.updated_at),
  };
}

function getMatchedFields(
  location: Location,
  input: PartialLocation,
  coordinateToleranceDegrees: number,
  row?: DatabaseRow
): string[] {
  const matchedFields: string[] = [];
  if (normalizeText(location.name) && normalizeText(location.name) === normalizeText(input.name)) {
    matchedFields.push('name');
  }
  if (location.googleMapsUrl && input.googleMapsUrl?.trim() === location.googleMapsUrl) {
    matchedFields.push('googleMapsUrl');
  }
  if (
    input.gpsCoordinates &&
    typeof location.latitude === 'number' &&
    typeof location.longitude === 'number' &&
    Math.abs(location.latitude - input.gpsCoordinates.latitude) <= coordinateToleranceDegrees &&
    Math.abs(location.longitude - input.gpsCoordinates.longitude) <= coordinateToleranceDegrees
  ) {
    matchedFields.push('gpsCoordinates');
  }
  if (row?.matched_instagram_url) {
    matchedFields.push('instagramUrl');
  }

  return matchedFields;
}

function scoreLocation(location: Location, input: PartialLocation, coordinateToleranceDegrees: number, row?: DatabaseRow) {
  return getMatchedFields(location, input, coordinateToleranceDegrees, row).reduce((score, field) => {
    if (field === 'instagramUrl') {
      return score + 0.9;
    }
    if (field === 'googleMapsUrl') {
      return score + 0.7;
    }
    if (field === 'name') {
      return score + 0.6;
    }
    if (field === 'gpsCoordinates') {
      return score + 0.5;
    }

    return score;
  }, 0);
}

function buildSourceInstagramLinks(values: string[] | null | undefined) {
  const canonicalUrls = canonicalizeInstagramUrls(values);
  return canonicalUrls.map((canonicalUrl) => ({
    canonicalUrl,
    originalUrl: values?.find((value) => canonicalizeInstagramUrls([value])[0] === canonicalUrl) ?? canonicalUrl,
  }));
}

function buildInsertInstagramLinkStatement(
  locationId: string,
  link: { canonicalUrl: string; originalUrl: string },
  now: string
) {
  return {
    sql: `
      insert into location_instagram_links (
        id,
        location_id,
        original_url,
        canonical_url,
        created_at
      )
      values (
        :id,
        :locationId,
        :originalUrl,
        :canonicalUrl,
        cast(:now as timestamptz)
      )
      on conflict (canonical_url) do nothing
    `,
    parameters: {
      canonicalUrl: link.canonicalUrl,
      id: `instagram-link-${slugify(link.canonicalUrl)}`,
      locationId,
      now,
      originalUrl: link.originalUrl,
    },
  };
}

function fallbackLocationRow(parameters: DatabaseParameters, now: string): DatabaseRow {
  return {
    created_at: now,
    field_confidence_json: parameters.fieldConfidenceJson ?? null,
    google_maps_url: parameters.googleMapsUrl ?? null,
    id: String(parameters.id ?? ''),
    instagram_feed_url: parameters.instagramFeedUrl ?? null,
    latitude: parameters.latitude ?? null,
    longitude: parameters.longitude ?? null,
    name: parameters.name ?? null,
    trail_map_url: parameters.trailMapUrl ?? null,
    updated_at: now,
  };
}

function createLocationId(input: RecognizedLocation) {
  const slug = slugify(input.name ?? input.googleMapsUrl ?? input.instagramFeedUrl ?? 'recognized-location');
  return `location-${slug}`;
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

  return slug || 'recognized-location';
}

function normalizeText(value: string | null | undefined) {
  return value?.trim().toLowerCase().replace(/\s+/g, ' ') || null;
}

function nullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toIsoDateString(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  return new Date(0).toISOString();
}
