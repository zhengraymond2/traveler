import type * as ImagePicker from 'expo-image-picker';

export type SelectedPhoto = {
  fileName?: string | null;
  uri: string;
};

export function parseCoordinates(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  const [latitudeText, longitudeText] = normalized.split(',').map((part) => part.trim());
  const latitude = Number(latitudeText);
  const longitude = Number(longitudeText);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('GPS coordinates should look like "37.7749, -122.4194".');
  }

  return { latitude, longitude };
}

export function toSelectedPhoto(asset: ImagePicker.ImagePickerAsset): SelectedPhoto {
  return {
    fileName: asset.fileName,
    uri: asset.uri,
  };
}

export function mergePhotos(currentPhotos: SelectedPhoto[], newPhotos: SelectedPhoto[]) {
  const existingUris = new Set(currentPhotos.map((photo) => photo.uri));
  const uniqueNewPhotos = newPhotos.filter((photo) => {
    if (existingUris.has(photo.uri)) {
      return false;
    }
    existingUris.add(photo.uri);
    return true;
  });

  return [...currentPhotos, ...uniqueNewPhotos];
}
