import { AppColors } from './theme';

export type LocationCategoryKind =
  | 'accommodation'
  | 'airport'
  | 'attraction'
  | 'bar'
  | 'beach'
  | 'bus_station'
  | 'cafe'
  | 'campsite'
  | 'diving'
  | 'ferry'
  | 'hiking_trail'
  | 'museum'
  | 'park'
  | 'restaurant'
  | 'ski'
  | 'surf'
  | 'train_station'
  | 'viewpoint';

export type LocationCategoryAppearance = {
  aliases: readonly string[];
  color: string;
  glyph: string;
  kind: LocationCategoryKind;
  label: string;
};

export const LocationCategoryAppearances = {
  accommodation: {
    aliases: ['hotel', 'hostel', 'lodging', 'stay', 'inn', 'ryokan', 'accommodation'],
    color: '#5f6edb',
    glyph: '⌂',
    kind: 'accommodation',
    label: 'Accommodation',
  },
  airport: {
    aliases: ['airport', 'airfield', 'terminal'],
    color: '#46616f',
    glyph: '✈',
    kind: 'airport',
    label: 'Airport',
  },
  attraction: {
    aliases: ['activity', 'attraction', 'landmark', 'sight', 'tour'],
    color: AppColors.primary,
    glyph: '✦',
    kind: 'attraction',
    label: 'Attraction',
  },
  bar: {
    aliases: ['bar', 'pub', 'wine', 'cocktail'],
    color: '#9a5bb5',
    glyph: '◒',
    kind: 'bar',
    label: 'Bar',
  },
  beach: {
    aliases: ['beach', 'cove', 'island'],
    color: '#248ea6',
    glyph: '≈',
    kind: 'beach',
    label: 'Beach',
  },
  bus_station: {
    aliases: ['bus', 'coach station', 'bus station'],
    color: '#46616f',
    glyph: '▭',
    kind: 'bus_station',
    label: 'Bus station',
  },
  cafe: {
    aliases: ['cafe', 'coffee', 'bakery', 'tea'],
    color: '#b46a32',
    glyph: '☕',
    kind: 'cafe',
    label: 'Cafe',
  },
  campsite: {
    aliases: ['camp', 'campsite', 'campground'],
    color: '#417d4f',
    glyph: '△',
    kind: 'campsite',
    label: 'Campsite',
  },
  diving: {
    aliases: ['dive', 'diving', 'snorkel', 'reef'],
    color: '#087f8c',
    glyph: '◌',
    kind: 'diving',
    label: 'Diving spot',
  },
  ferry: {
    aliases: ['ferry', 'port', 'harbor', 'boat'],
    color: '#46616f',
    glyph: '▱',
    kind: 'ferry',
    label: 'Ferry',
  },
  hiking_trail: {
    aliases: ['hike', 'hiking', 'trail', 'trek', 'mountain'],
    color: '#1f8f5f',
    glyph: '△',
    kind: 'hiking_trail',
    label: 'Hiking trail',
  },
  museum: {
    aliases: ['museum', 'gallery', 'exhibit'],
    color: '#7c5caa',
    glyph: '▣',
    kind: 'museum',
    label: 'Museum',
  },
  park: {
    aliases: ['park', 'garden', 'nature'],
    color: '#1f8f5f',
    glyph: '♧',
    kind: 'park',
    label: 'Park',
  },
  restaurant: {
    aliases: ['restaurant', 'food', 'dining', 'ramen', 'sushi'],
    color: '#d96f2c',
    glyph: '🍴',
    kind: 'restaurant',
    label: 'Restaurant',
  },
  ski: {
    aliases: ['ski', 'snowboard', 'resort'],
    color: '#3c7fb1',
    glyph: '❄',
    kind: 'ski',
    label: 'Ski spot',
  },
  surf: {
    aliases: ['surf', 'break', 'wave'],
    color: '#248ea6',
    glyph: '∿',
    kind: 'surf',
    label: 'Surf spot',
  },
  train_station: {
    aliases: ['train', 'station', 'rail', 'metro', 'subway'],
    color: '#46616f',
    glyph: '▭',
    kind: 'train_station',
    label: 'Train station',
  },
  viewpoint: {
    aliases: ['view', 'viewpoint', 'lookout', 'overlook', 'vista'],
    color: '#7a7f2a',
    glyph: '◎',
    kind: 'viewpoint',
    label: 'Viewpoint',
  },
} satisfies Record<LocationCategoryKind, LocationCategoryAppearance>;

export function getLocationCategoryAppearance(category: string | null | undefined) {
  return LocationCategoryAppearances[getLocationCategoryKind(category)];
}

export function getLocationCategoryKind(category: string | null | undefined): LocationCategoryKind {
  const normalizedCategory = category?.trim().toLocaleLowerCase() ?? '';

  for (const appearance of Object.values(LocationCategoryAppearances)) {
    if (appearance.aliases.some((alias) => normalizedCategory.includes(alias))) {
      return appearance.kind;
    }
  }

  return 'attraction';
}
