import type {
  DatabaseClient,
  DatabaseResult,
  DatabaseRow,
  DatabaseStatement,
  DatabaseTransaction,
} from '@/services/contracts';

import { sqlLocationDirectorySchemaStatements } from '../sql-location-schema';
import { SqlRecognitionJobStore } from '../sql-recognition-job-store';

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

describe('SqlRecognitionJobStore', () => {
  test('schema creates recognition_jobs table', () => {
    expect(sqlLocationDirectorySchemaStatements.join('\n')).toContain('create table if not exists recognition_jobs');
    expect(sqlLocationDirectorySchemaStatements.join('\n')).toContain('partial_location_id text primary key');
  });

  test('creates a processing recognition job with store timestamps and conflict reset', async () => {
    const database = new RecordingDatabase();
    const store = new SqlRecognitionJobStore(database, {
      now: () => new Date('2026-06-22T12:00:00.000Z'),
    });

    await store.createProcessing({
      createdAt: '2024-01-01T00:00:00.000Z',
      id: 'partial-1',
      name: 'Great Wall of China',
    });

    expect(database.statements[0].sql).toContain('insert into recognition_jobs');
    expect(database.statements[0].sql).toContain('on conflict (partial_location_id) do update');
    expect(database.statements[0].sql).toContain('status = excluded.status');
    expect(database.statements[0].sql).toContain('canonical_location_id = null');
    expect(database.statements[0].sql).toContain('failure_reason = null');
    expect(database.statements[0].sql).toContain('recognized_location_json = null');
    expect(database.statements[0].sql).toContain('updated_at = excluded.updated_at');
    expect(database.statements[0].parameters).toMatchObject({
      createdAt: '2026-06-22T12:00:00.000Z',
      partialLocationId: 'partial-1',
      status: 'processing',
      updatedAt: '2026-06-22T12:00:00.000Z',
    });
  });

  test('marks a job matched with canonical location and recognized JSON', async () => {
    const database = new RecordingDatabase();
    const store = new SqlRecognitionJobStore(database, {
      now: () => new Date('2026-06-22T12:00:00.000Z'),
    });

    await store.markMatched('partial-1', {
      location: {
        allTrailsUrl: null,
        createdAt: '2026-06-22T12:00:00.000Z',
        fieldConfidenceJson: '{"name":0.99}',
        googleMapsUrl: null,
        id: 'location-great-wall',
        instagramFeedUrl: null,
        latitude: 40.4319,
        longitude: 116.5704,
        name: 'Great Wall of China',
        updatedAt: '2026-06-22T12:00:00.000Z',
      },
      recognizedLocation: {
        allTrailsUrl: null,
        fieldConfidence: { name: 0.99 },
        googleMapsUrl: null,
        instagramFeedUrl: null,
        latitude: 40.4319,
        longitude: 116.5704,
        name: 'Great Wall of China',
      },
    });

    expect(database.statements[0].sql).toContain('status = :status');
    expect(database.statements[0].parameters).toMatchObject({
      canonicalLocationId: 'location-great-wall',
      partialLocationId: 'partial-1',
      status: 'matched',
    });
    expect(String(database.statements[0].parameters?.recognizedLocationJson)).toContain('Great Wall of China');
  });

  test('marks a job as needsReview or failed with a reason', async () => {
    const database = new RecordingDatabase();
    const store = new SqlRecognitionJobStore(database, {
      now: () => new Date('2026-06-22T12:00:00.000Z'),
    });

    await store.markNeedsReview('partial-1', {
      reason: 'OpenRouter returned a low-confidence location name.',
      recognizedLocation: {
        allTrailsUrl: null,
        fieldConfidence: { name: 0.5 },
        googleMapsUrl: null,
        instagramFeedUrl: null,
        latitude: null,
        longitude: null,
        name: 'Possible Place',
      },
    });
    await store.markFailed('partial-2', 'Invalid message body.');

    expect(database.statements[0].parameters).toMatchObject({
      failureReason: 'OpenRouter returned a low-confidence location name.',
      partialLocationId: 'partial-1',
      status: 'needsReview',
    });
    expect(database.statements[1].parameters).toMatchObject({
      failureReason: 'Invalid message body.',
      partialLocationId: 'partial-2',
      status: 'failed',
    });
  });
});
