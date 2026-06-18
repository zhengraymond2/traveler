import type { LocationWithPhotos } from '@/db/repository';

export const unknownCountryLabel = 'Unknown';

export type CountryRowData = {
  imageUri?: string;
  name: string;
};

export function getCountryRows(locations: LocationWithPhotos[]): CountryRowData[] {
  const countriesByKey = new Map<string, string>();

  for (const location of locations) {
    const country = getCountryName(location);
    const key = normalizeCountryKey(country);
    const existingCountry = countriesByKey.get(key);

    if (!existingCountry || shouldPreferCountryLabel(country, existingCountry)) {
      countriesByKey.set(key, country);
    }
  }

  const countries = Array.from(countriesByKey.values()).sort((first, second) =>
    first === unknownCountryLabel ? 1 : second === unknownCountryLabel ? -1 : first.localeCompare(second)
  );

  return countries.map((country) => {
    const countryLocations = locations.filter((location) => normalizeCountryKey(getCountryName(location)) === normalizeCountryKey(country));
    return {
      name: country,
      imageUri: getStableRandomPhotoUri(country, countryLocations),
    };
  });
}

function getCountryName(location: LocationWithPhotos) {
  return location.country?.trim() || unknownCountryLabel;
}

function shouldPreferCountryLabel(candidate: string, existing: string) {
  return candidate !== candidate.toLocaleLowerCase() && existing === existing.toLocaleLowerCase();
}

function normalizeCountryKey(value: string) {
  return value.trim().toLocaleLowerCase();
}

function getStableRandomPhotoUri(seed: string, locations: LocationWithPhotos[]) {
  const photos = locations.flatMap((location) => location.photos);
  if (!photos.length) {
    return undefined;
  }

  return photos[hashString(seed) % photos.length]?.uri;
}

function hashString(value: string) {
  return Array.from(value).reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 0);
}
