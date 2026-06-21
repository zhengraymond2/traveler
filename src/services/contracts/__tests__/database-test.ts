import { createDatabaseStatement } from '../database';

describe('database contracts', () => {
  test('createDatabaseStatement carries sql text and named parameters', () => {
    const statement = createDatabaseStatement('select * from locations where id = :id', {
      id: 'location-1',
    });

    expect(statement.sql).toBe('select * from locations where id = :id');
    expect(statement.parameters?.id).toBe('location-1');
  });
});
