const anonymousAdjectives = [
  'Amber',
  'Aspen',
  'Azure',
  'Brave',
  'Cedar',
  'Copper',
  'Coral',
  'Evergreen',
  'Golden',
  'Harbor',
  'Indigo',
  'Juniper',
  'Maple',
  'Meadow',
  'Nimbus',
  'River',
  'Sage',
  'Silver',
  'Summit',
  'Willow',
] as const;

const anonymousAnimals = [
  'Badger',
  'Crane',
  'Dolphin',
  'Falcon',
  'Finch',
  'Fox',
  'Heron',
  'Koala',
  'Lark',
  'Lynx',
  'Marten',
  'Otter',
  'Owl',
  'Panda',
  'Seal',
  'Swan',
  'Turtle',
  'Whale',
  'Wren',
  'Yak',
] as const;

export function createAnonymousDisplayName(seed: string) {
  const hash = hashString(seed);
  const adjective = anonymousAdjectives[hash % anonymousAdjectives.length];
  const animal = anonymousAnimals[Math.floor(hash / anonymousAdjectives.length) % anonymousAnimals.length];

  return `Anonymous ${adjective} ${animal}`;
}

export function createInitials(displayName: string) {
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.at(0)?.toLocaleUpperCase())
    .join('');

  return initials || 'A';
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}
