export const TravelRegionCatalog = {
  pnw: {
    label: 'PNW',
    aliases: ['pacific northwest', 'cascadia'],
  },
  southwestUsa: {
    label: 'Southwest USA',
    aliases: ['american southwest', 'southwest us'],
  },
  midwestUsa: {
    label: 'Midwest USA',
    aliases: ['midwest us', 'american midwest'],
  },
  canadianRockies: {
    label: 'Canadian Rockies',
    aliases: ['canadian rockies', 'banff jasper'],
  },
  madeira: {
    label: 'Madeira',
    aliases: ['madeira island'],
  },
  azores: {
    label: 'Azores',
    aliases: ['acores'],
  },
  faroeIslands: {
    label: 'Faroe Islands',
    aliases: ['faroe', 'faroes'],
  },
  lofoten: {
    label: 'Lofoten',
    aliases: ['lofoten islands'],
  },
  socotra: {
    label: 'Socotra',
    aliases: ['socotra island'],
  },
  hokkaido: {
    label: 'Hokkaido',
    aliases: ['hokkaido japan'],
  },
  japan: {
    label: 'Japan',
    aliases: ['honshu', 'kyushu', 'shikoku'],
  },
  patagonia: {
    label: 'Patagonia',
    aliases: ['argentine patagonia', 'chilean patagonia'],
  },
  dolomites: {
    label: 'Dolomites',
    aliases: ['italian dolomites'],
  },
  alps: {
    label: 'Alps',
    aliases: ['european alps'],
  },
  balkans: {
    label: 'Balkans',
    aliases: ['balkan peninsula'],
  },
  yucatan: {
    label: 'Yucatan',
    aliases: ['yucatan peninsula'],
  },
  bajaCalifornia: {
    label: 'Baja California',
    aliases: ['baja'],
  },
  queensland: {
    label: 'Queensland',
    aliases: ['tropical north queensland'],
  },
} as const;

export type TravelRegionCode = keyof typeof TravelRegionCatalog;

export type TravelRegion = {
  aliases: readonly string[];
  label: string;
};

export function getTravelRegions() {
  return Object.entries(TravelRegionCatalog).map(([code, region]) => ({
    code: code as TravelRegionCode,
    ...region,
  }));
}

export function getMatchingTravelRegion(searchText: string) {
  const normalizedSearch = normalizeRegionKey(searchText);
  if (!normalizedSearch) {
    return undefined;
  }

  return getTravelRegions().find((region) => {
    const keys = [region.label, ...region.aliases].map(normalizeRegionKey);
    return keys.includes(normalizedSearch);
  });
}

export function normalizeRegionKey(value: string | null | undefined) {
  return value?.trim().toLocaleLowerCase() ?? '';
}
