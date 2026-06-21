import type {
  DatabaseClient,
  DatabaseParameters,
  DatabaseResult,
  DatabaseRow,
  DatabaseStatement,
  DatabaseTransaction,
  DatabaseValue,
} from '@/services/contracts';

import { loadAwsStagingDatabaseConfigFromEnv, type AwsAuroraDataApiConfig } from './staging-config';

type DataApiValue =
  | { stringValue: string }
  | { longValue: number }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { isNull: true };

type DataApiParameter = {
  name: string;
  value: DataApiValue;
};

type DataApiField = Partial<{
  stringValue: string;
  longValue: number;
  doubleValue: number;
  booleanValue: boolean;
  isNull: boolean;
}>;

type DataApiResponse = Partial<{
  columnMetadata: { name?: string }[];
  numberOfRecordsUpdated: number;
  records: DataApiField[][];
  transactionId: string;
}>;

export type RdsDataApiCommand = {
  input: Record<string, unknown>;
};

export type RdsDataApiClientLike = {
  send(command: RdsDataApiCommand): Promise<DataApiResponse>;
};

type RdsDataApiCommandConstructor = new (input: Record<string, unknown>) => RdsDataApiCommand;

export type RdsDataApiCommands = {
  BeginTransactionCommand: RdsDataApiCommandConstructor;
  CommitTransactionCommand: RdsDataApiCommandConstructor;
  ExecuteStatementCommand: RdsDataApiCommandConstructor;
  RollbackTransactionCommand: RdsDataApiCommandConstructor;
};

export class AwsAuroraDataApiDatabase implements DatabaseClient {
  constructor(
    private readonly config: AwsAuroraDataApiConfig,
    private readonly client: RdsDataApiClientLike,
    private readonly commands: RdsDataApiCommands
  ) {}

  async execute<Row extends DatabaseRow = DatabaseRow>(statement: DatabaseStatement): Promise<DatabaseResult<Row>> {
    return this.executeStatement(statement);
  }

  async transaction<Result>(operation: (transaction: DatabaseTransaction) => Promise<Result>): Promise<Result> {
    const beginResponse = await this.client.send(
      new this.commands.BeginTransactionCommand({
        database: this.config.database,
        resourceArn: this.config.resourceArn,
        secretArn: this.config.secretArn,
      })
    );
    const transactionId = beginResponse.transactionId;
    if (!transactionId) {
      throw new Error('Aurora Data API did not return a transaction id.');
    }

    const transaction = new AwsAuroraDataApiTransaction(this, transactionId);

    try {
      const result = await operation(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  executeInTransaction<Row extends DatabaseRow = DatabaseRow>(
    statement: DatabaseStatement,
    transactionId: string
  ): Promise<DatabaseResult<Row>> {
    return this.executeStatement(statement, transactionId);
  }

  commitTransaction(transactionId: string): Promise<void> {
    return this.sendTransactionCommand(this.commands.CommitTransactionCommand, transactionId);
  }

  rollbackTransaction(transactionId: string): Promise<void> {
    return this.sendTransactionCommand(this.commands.RollbackTransactionCommand, transactionId);
  }

  private async executeStatement<Row extends DatabaseRow = DatabaseRow>(
    statement: DatabaseStatement,
    transactionId?: string
  ): Promise<DatabaseResult<Row>> {
    const response = await this.client.send(
      new this.commands.ExecuteStatementCommand({
        database: this.config.database,
        includeResultMetadata: true,
        parameters: toDataApiParameters(statement.parameters),
        resourceArn: this.config.resourceArn,
        secretArn: this.config.secretArn,
        sql: statement.sql,
        ...(transactionId ? { transactionId } : {}),
      })
    );

    return {
      numberOfRecordsUpdated: response.numberOfRecordsUpdated,
      rows: toDatabaseRows<Row>(response),
    };
  }

  private async sendTransactionCommand(command: RdsDataApiCommandConstructor, transactionId: string) {
    await this.client.send(
      new command({
        resourceArn: this.config.resourceArn,
        secretArn: this.config.secretArn,
        transactionId,
      })
    );
  }
}

class AwsAuroraDataApiTransaction implements DatabaseTransaction {
  private isClosed = false;

  constructor(
    private readonly database: AwsAuroraDataApiDatabase,
    private readonly transactionId: string
  ) {}

  execute<Row extends DatabaseRow = DatabaseRow>(statement: DatabaseStatement): Promise<DatabaseResult<Row>> {
    return this.database.executeInTransaction(statement, this.transactionId);
  }

  async commit(): Promise<void> {
    if (this.isClosed) {
      return;
    }
    this.isClosed = true;
    await this.database.commitTransaction(this.transactionId);
  }

  async rollback(): Promise<void> {
    if (this.isClosed) {
      return;
    }
    this.isClosed = true;
    await this.database.rollbackTransaction(this.transactionId);
  }
}

export async function createAwsStagingDatabaseFromEnv(
  env: Record<string, string | undefined> = readProcessEnv()
): Promise<AwsAuroraDataApiDatabase> {
  const config = loadAwsStagingDatabaseConfigFromEnv(env);
  const sdk = await import('@aws-sdk/client-rds-data');
  const client = new sdk.RDSDataClient({ region: config.region }) as RdsDataApiClientLike;

  return new AwsAuroraDataApiDatabase(config, client, {
    BeginTransactionCommand: sdk.BeginTransactionCommand as unknown as RdsDataApiCommandConstructor,
    CommitTransactionCommand: sdk.CommitTransactionCommand as unknown as RdsDataApiCommandConstructor,
    ExecuteStatementCommand: sdk.ExecuteStatementCommand as unknown as RdsDataApiCommandConstructor,
    RollbackTransactionCommand: sdk.RollbackTransactionCommand as unknown as RdsDataApiCommandConstructor,
  });
}

export { loadAwsStagingDatabaseConfigFromEnv, type AwsAuroraDataApiConfig };

function toDataApiParameters(parameters: DatabaseParameters | undefined): DataApiParameter[] {
  return Object.entries(parameters ?? {})
    .filter((entry): entry is [string, DatabaseValue] => entry[1] !== undefined)
    .map(([name, value]) => ({
      name,
      value: toDataApiValue(value),
    }));
}

function toDataApiValue(value: DatabaseValue): DataApiValue {
  if (value === null) {
    return { isNull: true };
  }
  if (value instanceof Date) {
    return { stringValue: value.toISOString() };
  }
  if (typeof value === 'string') {
    return { stringValue: value };
  }
  if (typeof value === 'boolean') {
    return { booleanValue: value };
  }
  if (Number.isInteger(value)) {
    return { longValue: value };
  }

  return { doubleValue: value };
}

function toDatabaseRows<Row extends DatabaseRow>(response: DataApiResponse): Row[] {
  const columnNames = response.columnMetadata?.map((column, index) => column.name ?? `column_${index}`) ?? [];
  return (
    response.records?.map((record) =>
      record.reduce<DatabaseRow>((row, field, index) => {
        row[columnNames[index] ?? `column_${index}`] = fromDataApiField(field);
        return row;
      }, {})
    ) ?? []
  ) as Row[];
}

function fromDataApiField(field: DataApiField): DatabaseValue {
  if (field.isNull) {
    return null;
  }
  if (field.stringValue !== undefined) {
    return field.stringValue;
  }
  if (field.longValue !== undefined) {
    return field.longValue;
  }
  if (field.doubleValue !== undefined) {
    return field.doubleValue;
  }
  if (field.booleanValue !== undefined) {
    return field.booleanValue;
  }

  return null;
}

function readProcessEnv() {
  const globalWithProcess = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  };

  return globalWithProcess.process?.env ?? {};
}
