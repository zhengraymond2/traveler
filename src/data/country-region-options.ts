import countries from 'world-countries';

import { getMatchingTravelRegion, getTravelRegions, normalizeRegionKey } from '@/constants/travel-regions';

export type CountryRegionOption = {
  detail?: string;
  isRecent?: boolean;
  label: string;
  source: 'country' | 'custom' | 'region' | 'typed';
  value: string;
};

type SavedRegionRecord = {
  country: string | null;
  createdAt: Date;
};

type BuildCountryRegionOptionsInput = {
  recentRegion?: string;
  selectedRegion?: string;
  savedRegions: SavedRegionRecord[];
  searchText: string;
};

const collator = new Intl.Collator(undefined, { sensitivity: 'base' });

const worldCountryOptions = countries
  .map<CountryRegionOption>((country) => ({
    detail: [country.region, country.subregion].filter(Boolean).join(' · '),
    label: country.name.common,
    source: 'country',
    value: country.name.common,
  }))
  .sort(compareOptionsByLabel);

const travelRegionOptions = getTravelRegions()
  .map<CountryRegionOption>((region) => ({
    detail: 'Travel region',
    label: region.label,
    source: 'region',
    value: region.label,
  }))
  .sort(compareOptionsByLabel);

const worldCountryKeys = new Set(worldCountryOptions.map((country) => normalizeKey(country.value)));
const travelRegionKeys = new Set(travelRegionOptions.map((region) => normalizeKey(region.value)));

export function buildCountryRegionOptions({
  recentRegion,
  selectedRegion,
  savedRegions,
  searchText,
}: BuildCountryRegionOptionsInput): CountryRegionOption[] {
  const customRegionOptions = getCustomRegionOptions(savedRegions);
  const baseOptions = [...worldCountryOptions, ...travelRegionOptions, ...customRegionOptions].sort(compareOptionsByLabel);
  const typedOption = getTypedCustomOption(baseOptions, searchText);
  const selectedOption = getSelectedCustomOption(baseOptions, selectedRegion);
  const options = [typedOption, selectedOption, ...baseOptions]
    .filter(isCountryRegionOption)
    .sort((first, second) => compareOptionsForSearch(first, second, searchText));
  const recentOption = getRecentOption(options, recentRegion);

  if (!recentOption) {
    return options;
  }

  return [
    {
      ...recentOption,
      isRecent: true,
    },
    ...options.filter((option) => normalizeKey(option.value) !== normalizeKey(recentOption.value)),
  ];
}

export function getMostRecentRegion(savedRegions: SavedRegionRecord[]) {
  return [...savedRegions]
    .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime())
    .find((record) => record.country?.trim())?.country?.trim();
}

export function getMatchingCountryRegion(searchText: string) {
  const normalizedSearch = normalizeKey(searchText);
  if (!normalizedSearch) {
    return undefined;
  }

  const travelRegion = getMatchingTravelRegion(searchText);
  if (travelRegion) {
    return travelRegionOptions.find((option) => normalizeKey(option.label) === normalizeRegionKey(travelRegion.label));
  }

  return worldCountryOptions.find((option) => normalizeKey(option.label) === normalizedSearch);
}

export function hasCountryRegionMatch(options: CountryRegionOption[], searchText: string) {
  const normalizedSearch = normalizeKey(searchText);
  if (!normalizedSearch) {
    return false;
  }

  return options.some((option) => itemMatchesSearch(option, normalizedSearch));
}

function getCustomRegionOptions(savedRegions: SavedRegionRecord[]) {
  const customRegions = new Map<string, string>();

  for (const record of savedRegions) {
    const region = record.country?.trim();
    const key = normalizeKey(region);
    if (!region || !key || worldCountryKeys.has(key) || travelRegionKeys.has(key) || customRegions.has(key)) {
      continue;
    }

    customRegions.set(key, region);
  }

  return Array.from(customRegions.values()).map<CountryRegionOption>((region) => ({
    detail: 'Custom region',
    label: region,
    source: 'custom',
    value: region,
  }));
}

function getTypedCustomOption(options: CountryRegionOption[], searchText: string) {
  const typedRegion = searchText.trim();
  if (!typedRegion || hasCountryRegionMatch(options, typedRegion)) {
    return undefined;
  }

  return {
    detail: 'Custom region',
    label: typedRegion,
    source: 'typed',
    value: typedRegion,
  } satisfies CountryRegionOption;
}

function getSelectedCustomOption(options: CountryRegionOption[], selectedRegion: string | undefined) {
  const selectedValue = selectedRegion?.trim();
  if (!selectedValue || hasCountryRegionMatch(options, selectedValue)) {
    return undefined;
  }

  return {
    detail: 'Custom region',
    label: selectedValue,
    source: 'custom',
    value: selectedValue,
  } satisfies CountryRegionOption;
}

function getRecentOption(options: CountryRegionOption[], recentRegion: string | undefined) {
  const recentKey = normalizeKey(recentRegion);
  if (!recentKey) {
    return undefined;
  }

  return (
    options.find((option) => normalizeKey(option.value) === recentKey) ?? {
      detail: 'Custom region',
      label: recentRegion?.trim() ?? '',
      source: 'custom',
      value: recentRegion?.trim() ?? '',
    }
  );
}

function isCountryRegionOption(option: CountryRegionOption | undefined): option is CountryRegionOption {
  return Boolean(option);
}

function itemText(option: CountryRegionOption) {
  return `${option.label} ${option.detail ?? ''}`;
}

function itemMatchesSearch(option: CountryRegionOption, normalizedSearch: string) {
  return normalizeKey(itemText(option)).includes(normalizedSearch);
}

function compareOptionsByLabel(first: CountryRegionOption, second: CountryRegionOption) {
  return collator.compare(first.label, second.label);
}

function compareOptionsForSearch(first: CountryRegionOption, second: CountryRegionOption, searchText: string) {
  const normalizedSearch = normalizeKey(searchText);
  if (!normalizedSearch) {
    return compareOptionsByLabel(first, second);
  }

  const firstRank = getSearchRank(first, normalizedSearch);
  const secondRank = getSearchRank(second, normalizedSearch);
  if (firstRank !== secondRank) {
    return firstRank - secondRank;
  }

  return compareOptionsByLabel(first, second);
}

function getSearchRank(option: CountryRegionOption, normalizedSearch: string) {
  const label = normalizeKey(option.label);
  if (label === normalizedSearch) {
    return 0;
  }
  if (label.startsWith(normalizedSearch)) {
    return 1;
  }
  if (itemMatchesSearch(option, normalizedSearch)) {
    return 2;
  }
  return 3;
}

function normalizeKey(value: string | null | undefined) {
  return value?.trim().toLocaleLowerCase() ?? '';
}
