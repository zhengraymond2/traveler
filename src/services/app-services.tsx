import * as React from 'react';

import { LocationApiClient, createRemoteLocationIntakeService } from './api/location-api-client';
import type { LocationIntakeService } from './location-intake';

const defaultLocalApiUrl = 'http://127.0.0.1:8787';

export type AppServices = {
  locationIntakeService: LocationIntakeService;
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

export function createAppServices(options: { apiBaseUrl?: string } = {}): AppServices {
  const client = new LocationApiClient({
    baseUrl: options.apiBaseUrl ?? defaultLocalApiUrl,
  });

  return {
    locationIntakeService: createRemoteLocationIntakeService(client),
  };
}
