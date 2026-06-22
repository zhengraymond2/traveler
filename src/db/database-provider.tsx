import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';

import migrations from '../../drizzle/migrations';
import { db } from './client';
import { createLocationRepository, type LocationRepository } from './repository';
import { seedSampleLocations } from './sample-locations';
import { createTripRepository, type TripRepository } from './trips-repository';

type DatabaseContextValue = LocationRepository & TripRepository;

const DatabaseContext = React.createContext<DatabaseContextValue | null>(null);

const repository = {
  ...createLocationRepository(db),
  ...createTripRepository(db),
};

export function DatabaseProvider({ children }: React.PropsWithChildren) {
  const theme = useTheme();
  const { success, error } = useMigrations(db, migrations);
  const [isSeeded, setIsSeeded] = React.useState(false);
  const [seedError, setSeedError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (!success || error) {
      return;
    }

    let isActive = true;

    seedSampleLocations(repository)
      .then(() => {
        if (isActive) {
          setIsSeeded(true);
        }
      })
      .catch((caughtError: unknown) => {
        if (isActive) {
          setSeedError(caughtError instanceof Error ? caughtError : new Error('Unable to seed sample locations.'));
        }
      });

    return () => {
      isActive = false;
    };
  }, [error, success]);

  if ((!success && !error) || (success && !isSeeded && !seedError)) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || seedError) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text selectable variant="bodyMedium">
          {(error ?? seedError)?.message}
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
