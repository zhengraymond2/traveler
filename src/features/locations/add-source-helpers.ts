import type * as ImagePicker from 'expo-image-picker';

import type { AddSourceInput } from '@/services/contracts';

export type SelectedPhoto = {
  fileName?: string | null;
  uri: string;
};

export type CreateAddSourceInputParams = {
  googleMapsUrl: string;
  gpsCoordinates: string;
  instagramUrl: string;
  locationName: string;
  notes: string;
  photos: SelectedPhoto[];
  trailMapUrl: string;
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

export function createAddSourceInput(params: CreateAddSourceInputParams): AddSourceInput {
  const coordinates = parseCoordinates(params.gpsCoordinates);
  const input: AddSourceInput = {};
  const name = normalizeText(params.locationName);
  const googleMapsUrl = normalizeText(params.googleMapsUrl);
  const instagramUrl = normalizeText(params.instagramUrl);
  const allTrailsUrl = normalizeText(params.trailMapUrl);
  const privateDescription = normalizeText(params.notes);
  const sourcePhotoUris = params.photos.map((photo) => photo.uri).filter(Boolean);

  if (name) {
    input.name = name;
  }
  if (sourcePhotoUris.length) {
    input.sourcePhotoUris = sourcePhotoUris;
  }
  if (instagramUrl) {
    input.instagramUrls = [instagramUrl];
  }
  if (googleMapsUrl) {
    input.googleMapsUrl = googleMapsUrl;
  }
  if (coordinates) {
    input.gpsCoordinates = coordinates;
  }
  if (allTrailsUrl) {
    input.allTrailsUrl = allTrailsUrl;
  }
  if (privateDescription) {
    input.privateDescription = privateDescription;
  }

  return input;
}

function normalizeText(value: string) {
  const normalized = value.trim();
  return normalized || undefined;
}
