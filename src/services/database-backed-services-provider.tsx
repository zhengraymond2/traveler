import * as React from 'react';

import { useDatabase } from '@/db/database-provider';
import type { AddSourceInput } from '@/services/contracts';

import { LocationApiClient } from './api/location-api-client';
import { createAppServices, getDefaultApiBaseUrl, ServicesProvider } from './app-services';
import { createRepositorySavedLocationsLocalCache, createSyncedSavedLocationsReader } from './saved-locations';

export function DatabaseBackedServicesProvider({ children }: React.PropsWithChildren) {
  const repository = useDatabase();
  const services = React.useMemo(() => {
    const apiClient = new LocationApiClient({
      baseUrl: getDefaultApiBaseUrl(),
    });
    const services = createAppServices({
      savedLocationsReader: createSyncedSavedLocationsReader({
        canonicalLocationsClient: apiClient,
        localCache: createRepositorySavedLocationsLocalCache(repository),
      }),
    });

    return {
      ...services,
      locationIntakeService: {
        async addSource(input: AddSourceInput) {
          const result = await services.locationIntakeService.addSource(input);
          if (result.matchedLocations.length) {
            await repository.writer.upsertCachedCanonicalLocations(result.matchedLocations);
          }
          await repository.writer.cacheRemoteLocalLocation(result.localLocation);
          return result;
        },
      },
    };
  }, [repository]);

  return <ServicesProvider services={services}>{children}</ServicesProvider>;
}
