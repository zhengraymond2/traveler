import * as React from 'react';

import { LocationApiClient, createRemoteLocationIntakeService } from './api/location-api-client';
import type { LocationIntakeService } from './location-intake';
import { createEmptySavedLocationsReader, type SavedLocationsReader } from './saved-locations';

const defaultLocalApiUrl = 'http://127.0.0.1:8787';

export type AppServices = {
  locationIntakeService: LocationIntakeService;
  savedLocationsReader: SavedLocationsReader;
};

const ServicesContext = React.createContext<AppServices | null>(null);

export function ServicesProvider({
  children,
  services,
}: React.PropsWithChildren<{ services: AppServices }>) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices() {
  const services = React.useContext(ServicesContext);

  if (!services) {
    throw new Error('useServices must be used within ServicesProvider');
  }

  return services;
}

export function createAppServices(options: { apiBaseUrl?: string; savedLocationsReader?: SavedLocationsReader } = {}): AppServices {
  const client = new LocationApiClient({
    baseUrl: options.apiBaseUrl ?? getDefaultApiBaseUrl(),
  });

  return {
    locationIntakeService: createRemoteLocationIntakeService(client),
    savedLocationsReader: options.savedLocationsReader ?? createEmptySavedLocationsReader(),
  };
}

export function getDefaultApiBaseUrl() {
  return readPublicEnv('EXPO_PUBLIC_LOCATION_API_URL') ?? defaultLocalApiUrl;
}

function readPublicEnv(name: string) {
  const globalWithProcess = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  };

  return globalWithProcess.process?.env?.[name]?.trim() || undefined;
}
