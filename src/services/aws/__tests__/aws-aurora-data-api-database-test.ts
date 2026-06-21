import {
  AwsAuroraDataApiDatabase,
  loadAwsStagingDatabaseConfigFromEnv,
  type RdsDataApiClientLike,
} from '../aws-aurora-data-api-database';

class FakeCommand {
  constructor(readonly input: Record<string, unknown>) {}
}

const fakeCommands = {
  BeginTransactionCommand: FakeCommand,
  CommitTransactionCommand: FakeCommand,
  ExecuteStatementCommand: FakeCommand,
  RollbackTransactionCommand: FakeCommand,
};

class FakeRdsClient implements RdsDataApiClientLike {
  readonly commands: FakeCommand[] = [];

  constructor(private readonly responses: Record<string, unknown>[] = []) {}

  async send(command: FakeCommand) {
    this.commands.push(command);
    return this.responses.shift() ?? {};
  }
}

const config = {
  database: 'traveler_staging',
  region: 'us-east-1',
  resourceArn: 'arn:aws:rds:us-east-1:123456789012:cluster:traveler-staging',
  secretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:traveler-staging',
};

describe('AwsAuroraDataApiDatabase', () => {
  test('loads staging config from env vars', () => {
    expect(
      loadAwsStagingDatabaseConfigFromEnv({
        AWS_REGION: 'us-east-1',
        TRAVELER_AURORA_DATABASE: 'traveler_staging',
        TRAVELER_AURORA_RESOURCE_ARN: 'resource-arn',
        TRAVELER_AURORA_SECRET_ARN: 'secret-arn',
      })
    ).toEqual({
      database: 'traveler_staging',
      region: 'us-east-1',
      resourceArn: 'resource-arn',
      secretArn: 'secret-arn',
    });
  });

  test('throws a helpful error when staging env vars are missing', () => {
    expect(() => loadAwsStagingDatabaseConfigFromEnv({ AWS_REGION: 'us-east-1' })).toThrow(
      'Missing Aurora staging env vars: TRAVELER_AURORA_RESOURCE_ARN, TRAVELER_AURORA_SECRET_ARN, TRAVELER_AURORA_DATABASE'
    );
  });

  test('executes statements with Data API named parameters and maps rows', async () => {
    const client = new FakeRdsClient([
      {
        columnMetadata: [{ name: 'id' }, { name: 'name' }, { name: 'latitude' }, { name: 'is_public' }],
        numberOfRecordsUpdated: 1,
        records: [
          [
            { stringValue: 'location-1' },
            { stringValue: 'Great Wall of China' },
            { doubleValue: 40.4319 },
            { booleanValue: true },
          ],
        ],
      },
    ]);
    const database = new AwsAuroraDataApiDatabase(config, client, fakeCommands);

    await expect(
      database.execute({
        parameters: {
          id: 'location-1',
          isPublic: true,
          latitude: 40.4319,
          missing: null,
          visitCount: 3,
        },
        sql: 'select * from locations where id = :id',
      })
    ).resolves.toEqual({
      numberOfRecordsUpdated: 1,
      rows: [
        {
          id: 'location-1',
          is_public: true,
          latitude: 40.4319,
          name: 'Great Wall of China',
        },
      ],
    });
    expect(client.commands[0].input).toMatchObject({
      database: 'traveler_staging',
      includeResultMetadata: true,
      resourceArn: config.resourceArn,
      secretArn: config.secretArn,
      sql: 'select * from locations where id = :id',
    });
    expect(client.commands[0].input.parameters).toEqual([
      { name: 'id', value: { stringValue: 'location-1' } },
      { name: 'isPublic', value: { booleanValue: true } },
      { name: 'latitude', value: { doubleValue: 40.4319 } },
      { name: 'missing', value: { isNull: true } },
      { name: 'visitCount', value: { longValue: 3 } },
    ]);
  });

  test('commits successful transactions and rolls back failed transactions', async () => {
    const successfulClient = new FakeRdsClient([{ transactionId: 'tx-1' }, {}, {}]);
    const successfulDatabase = new AwsAuroraDataApiDatabase(config, successfulClient, fakeCommands);

    await successfulDatabase.transaction(async (transaction) => {
      await transaction.execute({ sql: 'insert into locations (id) values (:id)', parameters: { id: 'location-1' } });
    });

    expect(successfulClient.commands.map((command) => command.input)).toMatchObject([
      { database: 'traveler_staging', resourceArn: config.resourceArn, secretArn: config.secretArn },
      { sql: 'insert into locations (id) values (:id)', transactionId: 'tx-1' },
      { transactionId: 'tx-1' },
    ]);

    const failingClient = new FakeRdsClient([{ transactionId: 'tx-2' }, {}]);
    const failingDatabase = new AwsAuroraDataApiDatabase(config, failingClient, fakeCommands);

    await expect(
      failingDatabase.transaction(async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');
    expect(failingClient.commands.map((command) => command.input)).toMatchObject([
      { database: 'traveler_staging' },
      { transactionId: 'tx-2' },
    ]);
  });
});
