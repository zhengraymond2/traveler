import type { DatabaseClient, DatabaseResult, DatabaseRow, DatabaseStatement, DatabaseTransaction } from '@/services/contracts';

import { SqlLocationDirectory } from '../sql-location-directory';

class RecordingDatabase implements DatabaseClient {
  readonly statements: DatabaseStatement[] = [];

  constructor(private readonly results: DatabaseResult[] = []) {}

  async execute<Row extends DatabaseRow = DatabaseRow>(statement: DatabaseStatement): Promise<DatabaseResult<Row>> {
    this.statements.push(statement);
    return (this.results.shift() ?? { rows: [] }) as DatabaseResult<Row>;
  }

  async transaction<Result>(operation: (transaction: DatabaseTransaction) => Promise<Result>): Promise<Result> {
    return operation({
      execute: (statement) => this.execute(statement),
      commit: async () => undefined,
      rollback: async () => undefined,
    });
  }
}

const greatWallRow = {
  id: 'location-great-wall-of-china',
  name: 'Great Wall of China',
  google_maps_url: 'https://www.google.com/maps/search/?api=1&query=Great%20Wall%20of%20China',
  latitude: 40.4319,
  longitude: 116.5704,
  trail_map_url: null,
  instagram_feed_url: 'https://www.instagram.com/explore/locations/236834088/great-wall-of-china/',
  field_confidence_json: JSON.stringify({ name: 0.99 }),
  created_at: '2026-06-21T12:00:00.000Z',
  updated_at: '2026-06-21T12:00:00.000Z',
};

describe('SqlLocationDirectory', () => {
  test('searches locations by normalized name', async () => {
    const database = new RecordingDatabase([{ rows: [greatWallRow] }]);
    const directory = new SqlLocationDirectory(database);

    await expect(
      directory.search({
        createdAt: '2026-06-21T12:00:00.000Z',
        id: 'partial-1',
        name: '  GREAT wall OF china  ',
      })
    ).resolves.toMatchObject([
      {
        location: {
          id: 'location-great-wall-of-china',
          name: 'Great Wall of China',
        },
        matchedFields: ['name'],
      },
    ]);
    expect(database.statements[0].sql).toContain('lower(name) = :normalizedName');
    expect(database.statements[0].parameters?.normalizedName).toBe('great wall of china');
  });

  test('searches locations by Google Maps URL', async () => {
    const database = new RecordingDatabase([{ rows: [greatWallRow] }]);
    const directory = new SqlLocationDirectory(database);

    const results = await directory.search({
      createdAt: '2026-06-21T12:00:00.000Z',
      googleMapsUrl: greatWallRow.google_maps_url,
      id: 'partial-1',
    });

    expect(results[0].matchedFields).toContain('googleMapsUrl');
    expect(database.statements[0].sql).toContain('google_maps_url = :googleMapsUrl');
  });

  test('searches locations by nearby GPS coordinates', async () => {
    const database = new RecordingDatabase([{ rows: [greatWallRow] }]);
    const directory = new SqlLocationDirectory(database);

    const results = await directory.search({
      createdAt: '2026-06-21T12:00:00.000Z',
      gpsCoordinates: { latitude: 40.432, longitude: 116.5705 },
      id: 'partial-1',
    });

    expect(results[0].matchedFields).toContain('gpsCoordinates');
    expect(database.statements[0].sql).toContain('latitude between :minLatitude and :maxLatitude');
    expect(database.statements[0].parameters?.minLatitude).toBeLessThan(40.432);
  });

  test('searches locations by canonicalized Instagram source URL', async () => {
    const database = new RecordingDatabase([
      {
        rows: [
          {
            ...greatWallRow,
            matched_instagram_url: 'https://www.instagram.com/p/GreatWallPost/',
          },
        ],
      },
    ]);
    const directory = new SqlLocationDirectory(database);

    const results = await directory.search({
      createdAt: '2026-06-21T12:00:00.000Z',
      id: 'partial-1',
      instagramUrls: ['https://instagram.com/p/GreatWallPost/?utm_source=ig_web_copy_link'],
    });

    expect(results[0].matchedFields).toContain('instagramUrl');
    expect(database.statements[0].sql).toContain('location_instagram_links');
    expect(database.statements[0].parameters?.instagramUrl0).toBe('https://www.instagram.com/p/GreatWallPost/');
  });

  test('upserts recognized locations and returns the canonical Location', async () => {
    const database = new RecordingDatabase([{ rows: [greatWallRow] }]);
    const directory = new SqlLocationDirectory(database, {
      now: () => new Date('2026-06-21T12:00:00.000Z'),
    });

    await expect(
      directory.upsertLocation({
        allTrailsUrl: null,
        fieldConfidence: { name: 0.99 },
        googleMapsUrl: greatWallRow.google_maps_url,
        instagramFeedUrl: greatWallRow.instagram_feed_url,
        latitude: 40.4319,
        longitude: 116.5704,
        name: 'Great Wall of China',
      })
    ).resolves.toMatchObject({
      fieldConfidenceJson: JSON.stringify({ name: 0.99 }),
      id: 'location-great-wall-of-china',
      name: 'Great Wall of China',
    });
    expect(database.statements[0].sql).toContain('on conflict (id) do update');
    expect(database.statements[0].parameters).toMatchObject({
      id: 'location-great-wall-of-china',
      name: 'Great Wall of China',
    });
  });

  test('upserts recognized locations and attaches source Instagram URLs', async () => {
    const database = new RecordingDatabase([{ rows: [greatWallRow] }]);
    const directory = new SqlLocationDirectory(database, {
      now: () => new Date('2026-06-21T12:00:00.000Z'),
    });

    await directory.upsertLocation(
      {
        allTrailsUrl: null,
        fieldConfidence: { name: 0.99 },
        googleMapsUrl: greatWallRow.google_maps_url,
        instagramFeedUrl: greatWallRow.instagram_feed_url,
        latitude: 40.4319,
        longitude: 116.5704,
        name: 'Great Wall of China',
      },
      {
        partialLocation: {
          createdAt: '2026-06-21T12:00:00.000Z',
          id: 'partial-1',
          instagramUrls: ['https://instagram.com/p/GreatWallPost/?utm_source=ig_web_copy_link'],
        },
      }
    );

    expect(database.statements[1].sql).toContain('insert into location_instagram_links');
    expect(database.statements[1].parameters).toMatchObject({
      canonicalUrl: 'https://www.instagram.com/p/GreatWallPost/',
      locationId: 'location-great-wall-of-china',
      originalUrl: 'https://instagram.com/p/GreatWallPost/?utm_source=ig_web_copy_link',
    });
  });
});
