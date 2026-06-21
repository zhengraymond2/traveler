export type DatabasePrimitive = string | number | boolean | null;
export type DatabaseValue = DatabasePrimitive | Date;
export type DatabaseParameters = Record<string, DatabaseValue | undefined>;
export type DatabaseRow = Record<string, DatabaseValue>;

export type DatabaseStatement = {
  sql: string;
  parameters?: DatabaseParameters;
};

export type DatabaseResult<Row extends DatabaseRow = DatabaseRow> = {
  rows: Row[];
  numberOfRecordsUpdated?: number;
};

export interface DatabaseExecutor {
  execute<Row extends DatabaseRow = DatabaseRow>(statement: DatabaseStatement): Promise<DatabaseResult<Row>>;
}

export interface DatabaseTransaction extends DatabaseExecutor {
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface DatabaseClient extends DatabaseExecutor {
  transaction<Result>(operation: (transaction: DatabaseTransaction) => Promise<Result>): Promise<Result>;
}

export function createDatabaseStatement(sql: string, parameters?: DatabaseParameters): DatabaseStatement {
  return parameters ? { sql, parameters } : { sql };
}
