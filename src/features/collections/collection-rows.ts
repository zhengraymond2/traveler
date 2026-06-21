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
  imageUris: string[];
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
      imageUris: getCollectionPhotoUris(collection).slice(0, 4),
    }));
}

function getStableRandomPhotoUri(collection: CollectionRowSource) {
  const photoUris = getCollectionPhotoUris(collection);
  if (!photoUris.length) {
    return undefined;
  }

  return photoUris[hashString(collection.id) % photoUris.length];
}

function getCollectionPhotoUris(collection: CollectionRowSource) {
  return collection.locations.flatMap((location) => location.photos.map((photo) => photo.uri));
}

function hashString(value: string) {
  return Array.from(value).reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 0);
}
