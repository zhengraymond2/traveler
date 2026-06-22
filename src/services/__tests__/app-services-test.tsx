import * as React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';

import { ServicesProvider, useServices, type AppServices } from '../app-services';
import { LocationApiClient } from '../api/location-api-client';

describe('app services', () => {
  test('useServices returns injected services inside ServicesProvider', async () => {
    const services = createFakeServices();

    function Probe() {
      const injectedServices = useServices();
      return <Text>{injectedServices === services ? 'injected' : 'missing'}</Text>;
    }

    const result = await render(
      <ServicesProvider services={services}>
        <Probe />
      </ServicesProvider>
    );

    expect(result.getByText('injected')).toBeTruthy();
  });

  test('useServices throws a helpful error outside the provider', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    function Probe() {
      useServices();
      return <Text>unreachable</Text>;
    }

    await expect(render(<Probe />)).rejects.toThrow('useServices must be used within ServicesProvider');
    consoleError.mockRestore();
  });

  test('LocationApiClient serializes PartialLocation payloads', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      json: async () => ({ ok: true }),
      ok: true,
    });
    const client = new LocationApiClient({
      baseUrl: 'http://127.0.0.1:8787',
      fetchImpl,
    });

    await client.enqueuePartialLocation({
      id: 'partial-1',
      sourcePhotoUris: ['file:///great-wall.jpg'],
      createdAt: '2026-06-21T12:00:00.000Z',
    });

    expect(fetchImpl).toHaveBeenCalledWith('http://127.0.0.1:8787/partial-locations', {
      body: JSON.stringify({
        id: 'partial-1',
        sourcePhotoUris: ['file:///great-wall.jpg'],
        createdAt: '2026-06-21T12:00:00.000Z',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
  });

  test('LocationApiClient fetches canonical locations by id', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      json: async () => [{ id: 'location-great-wall', name: 'Great Wall of China' }],
      ok: true,
    });
    const client = new LocationApiClient({
      baseUrl: 'http://127.0.0.1:8787',
      fetchImpl,
    });

    await expect(client.getLocationsByIds(['location-great-wall'])).resolves.toEqual([
      { id: 'location-great-wall', name: 'Great Wall of China' },
    ]);
    expect(fetchImpl).toHaveBeenCalledWith('http://127.0.0.1:8787/locations?ids=location-great-wall', {
      method: 'GET',
    });
  });

  test('LocationApiClient surfaces Location API error messages', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      json: async () => ({ error: 'PartialLocation must include at least one clue.' }),
      ok: false,
      status: 500,
    });
    const client = new LocationApiClient({
      baseUrl: 'http://127.0.0.1:8787',
      fetchImpl,
    });

    await expect(client.addSource({})).rejects.toThrow('PartialLocation must include at least one clue.');
  });
});

function createFakeServices(): AppServices {
  return {
    locationIntakeService: {
      addSource: jest.fn(),
    },
    savedLocationsReader: {
      getLocation: jest.fn(),
      listLocationsWithPhotos: jest.fn(),
      listLocationsWithPhotosByCountry: jest.fn(),
      listLocationsWithoutCountryWithPhotos: jest.fn(),
    },
  };
}
