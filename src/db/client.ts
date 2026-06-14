import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

export const databaseName = 'traveler.db';

const sqlite = openDatabaseSync(databaseName, { enableChangeListener: true });

sqlite.execSync(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;
`);

export const db = drizzle(sqlite, { schema });
export const sqliteDatabase = sqlite;

export type AppDatabase = typeof db;
