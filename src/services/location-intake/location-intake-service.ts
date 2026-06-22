import type {
  AddSourceInput,
  AddSourceResult,
  EventsWriter,
  LocalLocationStore,
  LocationDirectory,
  PartialLocation,
  RecognitionJobStore,
} from '@/services/contracts';
import { assertValidPartialLocation } from '@/services/contracts';

export type LocationIntakeService = {
  addSource(input: AddSourceInput): Promise<AddSourceResult>;
};

export type LocationIntakeServiceDeps = {
  createId?: () => string;
  eventsWriter: EventsWriter;
  locationDirectory: LocationDirectory;
  localLocationStore: LocalLocationStore;
  now?: () => Date;
  recognitionJobStore?: RecognitionJobStore;
};

export function createLocationIntakeService(deps: LocationIntakeServiceDeps): LocationIntakeService {
  const createId = deps.createId ?? createLocalId;
  const now = deps.now ?? (() => new Date());

  return {
    async addSource(input) {
      const partialLocation = buildPartialLocation(input, createId, now);
      assertValidPartialLocation(partialLocation);

      const matches = await deps.locationDirectory.search(partialLocation);
      const matchedLocations = matches.map((match) => match.location);
      const topMatch = matchedLocations[0] ?? null;

      if (topMatch) {
        const localLocation = await deps.localLocationStore.upsertFromPartialLocation({
          partialLocation,
          source: input,
          status: 'matched',
          canonicalLocationId: topMatch.id,
        });

        return {
          localLocation,
          matchedLocations,
          processingCount: 0,
          emittedEvent: null,
        };
      }

      const localLocation = await deps.localLocationStore.upsertFromPartialLocation({
        partialLocation,
        source: input,
        status: 'processing',
      });
      await deps.recognitionJobStore?.createProcessing(partialLocation);
      await deps.eventsWriter.enqueuePartialLocation(partialLocation);

      return {
        localLocation,
        matchedLocations: [],
        processingCount: 1,
        emittedEvent: partialLocation,
      };
    },
  };
}

function buildPartialLocation(
  input: AddSourceInput,
  createId: () => string,
  now: () => Date
): PartialLocation {
  return removeEmptyPartialLocationFields({
    id: createId(),
    name: input.name,
    sourcePhotoUris: input.sourcePhotoUris,
    instagramUrls: input.instagramUrls,
    textCaption: input.textCaption,
    googleMapsUrl: input.googleMapsUrl,
    gpsCoordinates: input.gpsCoordinates,
    allTrailsUrl: input.allTrailsUrl,
    createdAt: now().toISOString(),
  });
}

function removeEmptyPartialLocationFields(input: PartialLocation): PartialLocation {
  return {
    id: input.id,
    ...(hasText(input.name) ? { name: input.name?.trim() } : {}),
    ...(hasItems(input.photoBlobIds) ? { photoBlobIds: normalizeItems(input.photoBlobIds) } : {}),
    ...(hasItems(input.sourcePhotoUris) ? { sourcePhotoUris: normalizeItems(input.sourcePhotoUris) } : {}),
    ...(hasItems(input.instagramUrls) ? { instagramUrls: normalizeItems(input.instagramUrls) } : {}),
    ...(hasText(input.textCaption) ? { textCaption: input.textCaption?.trim() } : {}),
    ...(hasText(input.googleMapsUrl) ? { googleMapsUrl: input.googleMapsUrl?.trim() } : {}),
    ...(input.gpsCoordinates ? { gpsCoordinates: input.gpsCoordinates } : {}),
    ...(hasText(input.allTrailsUrl) ? { allTrailsUrl: input.allTrailsUrl?.trim() } : {}),
    createdAt: input.createdAt,
  };
}

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function hasItems(value: string[] | undefined) {
  return Boolean(value?.some((item) => item.trim()));
}

function normalizeItems(value: string[] | undefined) {
  return value?.map((item) => item.trim()).filter(Boolean);
}

function createLocalId() {
  return `partial-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
