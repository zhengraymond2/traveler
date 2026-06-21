import type { LocationWithPhotos } from '@/db/repository';

export type CollectionRowSource = {
  id: string;
  title: string;
  kind: 'local' | 'shared';
  locations: LocationWithPhotos[];
};

export type CollectionRow = {
  id: string;
  title: string;
  kind: 'local' | 'shared';
  imageUri?: string;
};

export function getCollectionRows(collections: CollectionRowSource[]): CollectionRow[] {
  return [...collections]
    .sort((left, right) => {
      if (left.kind !== right.kind) {
        return left.kind === 'local' ? -1 : 1;
      }

      return left.title.localeCompare(right.title, undefined, { sensitivity: 'base' });
    })
    .map((collection) => ({
      id: collection.id,
      title: collection.title,
      kind: collection.kind,
      imageUri: getStableRandomPhotoUri(collection),
    }));
}

function getStableRandomPhotoUri(collection: CollectionRowSource) {
  const photos = collection.locations.flatMap((location) => location.photos);
  if (!photos.length) {
    return undefined;
  }

  return photos[hashString(collection.id) % photos.length]?.uri;
}

function hashString(value: string) {
  return Array.from(value).reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 0);
}
