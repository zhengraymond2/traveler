import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';

import migrations from '../../drizzle/migrations';
import { db } from './client';
import { createLocationRepository, type LocationRepository } from './repository';

type DatabaseContextValue = LocationRepository;

const DatabaseContext = React.createContext<DatabaseContextValue | null>(null);

const repository = createLocationRepository(db);

export function DatabaseProvider({ children }: React.PropsWithChildren) {
  const theme = useTheme();
  const { success, error } = useMigrations(db, migrations);

  if (!success && !error) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text selectable variant="bodyMedium">
          {error.message}
        </Text>
      </View>
    );
  }

  return <DatabaseContext.Provider value={repository}>{children}</DatabaseContext.Provider>;
}

export function useDatabase() {
  const value = React.use(DatabaseContext);

  if (!value) {
    throw new Error('useDatabase must be used within DatabaseProvider');
  }

  return value;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});
