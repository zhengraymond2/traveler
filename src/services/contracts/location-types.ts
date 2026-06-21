export type IsoDateString = string;

export type GpsCoordinates = {
  latitude: number;
  longitude: number;
};

export type PartialLocation = {
  id: string;
  name?: string | null;
  photoBlobIds?: string[];
  sourcePhotoUris?: string[];
  instagramUrls?: string[];
  textCaption?: string | null;
  googleMapsUrl?: string | null;
  gpsCoordinates?: GpsCoordinates | null;
  allTrailsUrl?: string | null;
  createdAt: IsoDateString;
};

export type LocalLocationStatus = 'processing' | 'matched' | 'needsReview' | 'failed';

export type LocalLocation = {
  id: string;
  canonicalLocationId: string | null;
  status: LocalLocationStatus;
  sourcePhotoUris: string[];
  sourceLinks: string[];
  sourceInstagramUrls: string[];
  privateDescription: string | null;
  lastPartialLocationId: string | null;
  addedAt: IsoDateString;
  updatedAt: IsoDateString;
};

export type RecognitionConfidence = Partial<{
  name: number;
  googleMapsUrl: number;
  gpsCoordinates: number;
  allTrailsUrl: number;
  instagramFeedUrl: number;
}>;

export type Location = {
  id: string;
  name: string | null;
  googleMapsUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  allTrailsUrl: string | null;
  instagramFeedUrl: string | null;
  fieldConfidenceJson: string | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
};

export type RecognizedLocation = {
  name: string | null;
  googleMapsUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  allTrailsUrl: string | null;
  instagramFeedUrl: string | null;
  fieldConfidence: RecognitionConfidence;
};

export type RecognizedLocationResult =
  | {
      kind: 'recognized';
      location: RecognizedLocation;
    }
  | {
      kind: 'needsReview';
      location: RecognizedLocation;
      reason: string;
    }
  | {
      kind: 'failed';
      reason: string;
    };

export type AddSourceInput = {
  name?: string | null;
  sourcePhotoUris?: string[];
  instagramUrls?: string[];
  textCaption?: string | null;
  googleMapsUrl?: string | null;
  gpsCoordinates?: GpsCoordinates | null;
  allTrailsUrl?: string | null;
  privateDescription?: string | null;
};

export type AddSourceResult = {
  localLocation: LocalLocation;
  matchedLocations: Location[];
  processingCount: number;
  emittedEvent: PartialLocation | null;
};

export function assertValidPartialLocation(input: PartialLocation): void {
  if (!hasPartialLocationClue(input)) {
    throw new Error('PartialLocation must include at least one clue.');
  }
}

export function hasPartialLocationClue(input: PartialLocation): boolean {
  return Boolean(
    hasText(input.name) ||
      hasItems(input.photoBlobIds) ||
      hasItems(input.sourcePhotoUris) ||
      hasItems(input.instagramUrls) ||
      hasText(input.textCaption) ||
      hasText(input.googleMapsUrl) ||
      hasGpsCoordinates(input.gpsCoordinates) ||
      hasText(input.allTrailsUrl)
  );
}

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function hasItems(value: string[] | undefined) {
  return Boolean(value?.some((item) => item.trim()));
}

function hasGpsCoordinates(value: GpsCoordinates | null | undefined) {
  return Boolean(value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude));
}
