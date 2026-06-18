import countries from 'world-countries';

import type { LocationWithPhotos } from '@/db/repository';

export type MapRegionSearchCoordinate = {
  latitude: number;
  longitude: number;
};

export type MapRegionSearchOption = {
  center: MapRegionSearchCoordinate | null;
  detail?: string;
  label: string;
  source: 'country' | 'custom' | 'unknown';
  value: string;
};

const collator = new Intl.Collator(undefined, { sensitivity: 'base' });

const worldCountriesByKey = new Map(
  countries.map((country) => [
    normalizeSearchKey(country.name.common),
    {
      center: {
        latitude: country.latlng[0],
        longitude: country.latlng[1],
      },
      detail: [country.region, country.subregion].filter(Boolean).join(' · '),
      label: country.name.common,
      source: 'country' as const,
      value: country.name.common,
    },
  ])
);

export function buildMapRegionSearchOptions(locations: LocationWithPhotos[]) {
  const regions = new Map<string, LocationWithPhotos[]>();

  for (const location of locations) {
    const region = location.country?.trim() || 'Unknown';
    const regionKey = normalizeSearchKey(region);
    const regionLocations = regions.get(regionKey) ?? [];
    regionLocations.push(location);
    regions.set(regionKey, regionLocations);
  }

  return Array.from(regions.entries())
    .map(([regionKey, regionLocations]) => {
      const firstRegionName = regionLocations[0]?.country?.trim() || 'Unknown';
      const countryOption = worldCountriesByKey.get(regionKey);

      if (countryOption) {
        return countryOption;
      }

      const center = getAverageCoordinate(regionLocations);
      const isUnknown = normalizeSearchKey(firstRegionName) === 'unknown';

      return {
        center,
        detail: isUnknown ? 'Uncategorized saved places' : 'Custom region',
        label: firstRegionName,
        source: isUnknown ? 'unknown' : 'custom',
        value: firstRegionName,
      } satisfies MapRegionSearchOption;
    })
    .sort((first, second) => collator.compare(first.label, second.label));
}

export function filterMapRegionSearchOptions(options: MapRegionSearchOption[], query: string) {
  const normalizedQuery = normalizeSearchKey(query);

  if (!normalizedQuery) {
    return options;
  }

  return options.filter((option) => normalizeSearchKey(`${option.label} ${option.detail ?? ''}`).includes(normalizedQuery));
}

export function normalizeSearchKey(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getAverageCoordinate(locations: LocationWithPhotos[]) {
  const coordinateLocations = locations.filter((location) => {
    return Number.isFinite(location.latitude) && Number.isFinite(location.longitude);
  });

  if (!coordinateLocations.length) {
    return null;
  }

  const coordinateSum = coordinateLocations.reduce(
    (sum, location) => ({
      latitude: sum.latitude + (location.latitude ?? 0),
      longitude: sum.longitude + (location.longitude ?? 0),
    }),
    { latitude: 0, longitude: 0 }
  );

  return {
    latitude: coordinateSum.latitude / coordinateLocations.length,
    longitude: coordinateSum.longitude / coordinateLocations.length,
  };
}
