import countries from 'world-countries';

import { MapTuning } from '@/constants/map';
import type { LocationWithPhotos } from '@/db/repository';

export type MapRegionSearchCoordinate = {
  latitude: number;
  longitude: number;
};

export type MapRegionSearchOption = {
  center: MapRegionSearchCoordinate | null;
  detail?: string;
  label: string;
  source: 'country' | 'custom' | 'location' | 'unknown';
  value: string;
  zoomLevel: number;
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
      zoomLevel: MapTuning.countryViewZoomLevel,
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

  const regionOptions = Array.from(regions.entries())
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
        zoomLevel: MapTuning.countryViewZoomLevel,
      } satisfies MapRegionSearchOption;
    });

  const locationOptions = locations
    .map((location) => createLocationSearchOption(location))
    .filter((option): option is MapRegionSearchOption => option !== null);

  return [...regionOptions, ...locationOptions].sort((first, second) => collator.compare(first.label, second.label));
}

export function filterMapRegionSearchOptions(options: MapRegionSearchOption[], query: string) {
  const normalizedQuery = normalizeSearchKey(query);

  if (!normalizedQuery) {
    return options;
  }

  return options
    .filter((option) => itemMatchesSearch(option, normalizedQuery))
    .sort((first, second) => {
      const rankComparison = getSearchRank(first, normalizedQuery) - getSearchRank(second, normalizedQuery);

      if (rankComparison !== 0) {
        return rankComparison;
      }

      return collator.compare(first.label, second.label);
    });
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

function createLocationSearchOption(location: LocationWithPhotos): MapRegionSearchOption | null {
  const label = location.name?.trim();

  if (!label) {
    return null;
  }

  const country = location.country?.trim();

  return {
    center:
      Number.isFinite(location.latitude) && Number.isFinite(location.longitude)
        ? {
            latitude: location.latitude ?? 0,
            longitude: location.longitude ?? 0,
          }
        : null,
    detail: [country, 'Saved location'].filter(Boolean).join(' · '),
    label,
    source: 'location',
    value: location.id,
    zoomLevel: MapTuning.locationSearchZoomLevel,
  } satisfies MapRegionSearchOption;
}

function itemMatchesSearch(option: MapRegionSearchOption, normalizedQuery: string) {
  return normalizeSearchKey(`${option.label} ${option.detail ?? ''}`).includes(normalizedQuery);
}

function getSearchRank(option: MapRegionSearchOption, normalizedQuery: string) {
  const label = normalizeSearchKey(option.label);
  const detail = normalizeSearchKey(option.detail ?? '');

  if (label === normalizedQuery) {
    return 0;
  }

  if (label.startsWith(normalizedQuery)) {
    return 1;
  }

  if (label.includes(normalizedQuery)) {
    return 2;
  }

  if (detail.includes(normalizedQuery)) {
    return 3;
  }

  return 4;
}
