import type { DatabaseClient, DatabaseResult, DatabaseRow, DatabaseStatement, DatabaseTransaction } from '@/services/contracts';

import { AwsLocationDirectory } from '../aws-location-directory';

class FakeDatabase implements DatabaseClient {
  readonly statements: DatabaseStatement[] = [];

  async execute<Row extends DatabaseRow = DatabaseRow>(statement: DatabaseStatement): Promise<DatabaseResult<Row>> {
    this.statements.push(statement);
    return {
      rows: [
        {
          created_at: '2026-06-21T12:00:00.000Z',
          field_confidence_json: '{"name":1}',
          google_maps_url: null,
          id: 'location-aurora-smoke-test-location',
          instagram_feed_url: null,
          latitude: null,
          longitude: null,
          name: 'Aurora Smoke Test Location',
          trail_map_url: null,
          updated_at: '2026-06-21T12:00:00.000Z',
        },
      ],
    } as unknown as DatabaseResult<Row>;
  }

  async transaction<Result>(operation: (transaction: DatabaseTransaction) => Promise<Result>): Promise<Result> {
    return operation({
      execute: (statement) => this.execute(statement),
      commit: async () => undefined,
      rollback: async () => undefined,
    });
  }
}

describe('AwsLocationDirectory', () => {
  test('uses the generic database client through the SQL location helper', async () => {
    const database = new FakeDatabase();
    const directory = new AwsLocationDirectory(database);

    await expect(
      directory.search({
        createdAt: '2026-06-21T12:00:00.000Z',
        id: 'partial-1',
        name: 'Aurora Smoke Test Location',
      })
    ).resolves.toMatchObject([
      {
        location: {
          id: 'location-aurora-smoke-test-location',
          name: 'Aurora Smoke Test Location',
        },
      },
    ]);
    expect(database.statements[0].sql).toContain('from locations');
  });
});
