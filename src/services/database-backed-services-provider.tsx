import * as React from 'react';

import { useDatabase } from '@/db/database-provider';

import { LocationApiClient } from './api/location-api-client';
import { createAppServices, getDefaultApiBaseUrl, ServicesProvider } from './app-services';
import { createRepositorySavedLocationsLocalCache, createSyncedSavedLocationsReader } from './saved-locations';

export function DatabaseBackedServicesProvider({ children }: React.PropsWithChildren) {
  const repository = useDatabase();
  const services = React.useMemo(() => {
    const apiClient = new LocationApiClient({
      baseUrl: getDefaultApiBaseUrl(),
    });

    return createAppServices({
      savedLocationsReader: createSyncedSavedLocationsReader({
        canonicalLocationsClient: apiClient,
        localCache: createRepositorySavedLocationsLocalCache(repository),
      }),
    });
  }, [repository]);

  return <ServicesProvider services={services}>{children}</ServicesProvider>;
}
