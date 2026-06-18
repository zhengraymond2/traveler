import { AppColors } from './theme';

export type LocationCategoryKind = 'hiking' | 'activity' | 'restaurant' | 'hotel' | 'transit';

export type LocationCategoryAppearance = {
  color: string;
  glyph: string;
  kind: LocationCategoryKind;
  label: string;
};

export const LocationCategoryAppearances = {
  hiking: {
    color: '#1f8f5f',
    glyph: '△',
    kind: 'hiking',
    label: 'Hiking',
  },
  activity: {
    color: AppColors.primary,
    glyph: '✦',
    kind: 'activity',
    label: 'Activity',
  },
  restaurant: {
    color: '#d96f2c',
    glyph: '🍴',
    kind: 'restaurant',
    label: 'Restaurant',
  },
  hotel: {
    color: '#5f6edb',
    glyph: '⌂',
    kind: 'hotel',
    label: 'Hotel',
  },
  transit: {
    color: '#46616f',
    glyph: '▭',
    kind: 'transit',
    label: 'Transit',
  },
} satisfies Record<LocationCategoryKind, LocationCategoryAppearance>;

export function getLocationCategoryAppearance(category: string | null | undefined) {
  return LocationCategoryAppearances[getLocationCategoryKind(category)];
}

export function getLocationCategoryKind(category: string | null | undefined): LocationCategoryKind {
  const normalizedCategory = category?.trim().toLocaleLowerCase() ?? '';

  if (/(hike|hiking|trail|trek|mountain|nature|park)/.test(normalizedCategory)) {
    return 'hiking';
  }

  if (/(restaurant|cafe|coffee|bar|food|dining|bakery|ramen|sushi)/.test(normalizedCategory)) {
    return 'restaurant';
  }

  if (/(hotel|hostel|lodging|stay|inn|ryokan|accommodation)/.test(normalizedCategory)) {
    return 'hotel';
  }

  if (/(transit|train|station|airport|bus|metro|subway|ferry|rail)/.test(normalizedCategory)) {
    return 'transit';
  }

  return 'activity';
}
