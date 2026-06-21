import type {
  LocalLocation,
  LocalLocationStatus,
  LocalLocationStore,
  PartialLocation,
  UpsertLocalLocationInput,
} from '@/services/contracts';

type InMemoryLocalLocationStoreOptions = {
  now?: () => Date;
  seedRecords?: LocalLocation[];
};

export class InMemoryLocalLocationStore implements LocalLocationStore {
  private records: LocalLocation[];
  private readonly now: () => Date;

  constructor(options: InMemoryLocalLocationStoreOptions = {}) {
    this.records = [...(options.seedRecords ?? [])];
    this.now = options.now ?? (() => new Date());
  }

  async upsertFromPartialLocation(input: UpsertLocalLocationInput): Promise<LocalLocation> {
    const existing = this.findMatchingRecord(input.partialLocation);
    const now = this.now().toISOString();

    if (existing) {
      const updated: LocalLocation = {
        ...existing,
        canonicalLocationId: input.canonicalLocationId ?? existing.canonicalLocationId,
        lastPartialLocationId: input.partialLocation.id,
        privateDescription: appendDescription(existing.privateDescription, input.source.privateDescription),
        sourceInstagramUrls: mergeUnique(existing.sourceInstagramUrls, input.partialLocation.instagramUrls),
        sourceLinks: mergeUnique(existing.sourceLinks, collectSourceLinks(input.partialLocation)),
        sourcePhotoUris: mergeUnique(existing.sourcePhotoUris, input.partialLocation.sourcePhotoUris),
        status: input.status,
        updatedAt: now,
      };
      this.records = this.records.map((record) => (record.id === existing.id ? updated : record));
      return updated;
    }

    const created: LocalLocation = {
      addedAt: now,
      canonicalLocationId: input.canonicalLocationId ?? null,
      id: `local-location-${this.records.length + 1}`,
      lastPartialLocationId: input.partialLocation.id,
      privateDescription: input.source.privateDescription?.trim() || null,
      sourceInstagramUrls: mergeUnique([], input.partialLocation.instagramUrls),
      sourceLinks: collectSourceLinks(input.partialLocation),
      sourcePhotoUris: mergeUnique([], input.partialLocation.sourcePhotoUris),
      status: input.status,
      updatedAt: now,
    };
    this.records.push(created);
    return created;
  }

  async linkCanonicalLocation(localLocationId: string, locationId: string): Promise<void> {
    this.records = this.records.map((record) =>
      record.id === localLocationId
        ? {
            ...record,
            canonicalLocationId: locationId,
            status: 'matched',
            updatedAt: this.now().toISOString(),
          }
        : record
    );
  }

  async updateStatus(localLocationId: string, status: LocalLocationStatus): Promise<void> {
    this.records = this.records.map((record) =>
      record.id === localLocationId
        ? {
            ...record,
            status,
            updatedAt: this.now().toISOString(),
          }
        : record
    );
  }

  async findByPartialLocation(partialLocation: PartialLocation): Promise<LocalLocation | null> {
    return this.findMatchingRecord(partialLocation) ?? null;
  }

  async listLocalLocations(): Promise<LocalLocation[]> {
    return [...this.records];
  }

  private findMatchingRecord(partialLocation: PartialLocation) {
    const sourceLinks = collectSourceLinks(partialLocation);
    return this.records.find(
      (record) =>
        intersects(record.sourcePhotoUris, partialLocation.sourcePhotoUris) ||
        intersects(record.sourceInstagramUrls, partialLocation.instagramUrls) ||
        intersects(record.sourceLinks, sourceLinks)
    );
  }
}

function collectSourceLinks(partialLocation: PartialLocation) {
  return mergeUnique([], [
    partialLocation.googleMapsUrl ?? undefined,
    partialLocation.allTrailsUrl ?? undefined,
    ...(partialLocation.instagramUrls ?? []),
  ]);
}

function mergeUnique(current: string[], next: (string | undefined)[] | undefined) {
  const values = new Set(current);
  for (const value of next ?? []) {
    const normalized = value?.trim();
    if (normalized) {
      values.add(normalized);
    }
  }

  return Array.from(values);
}

function intersects(first: string[], second: string[] | undefined) {
  const firstValues = new Set(first);
  return Boolean(second?.some((value) => firstValues.has(value.trim())));
}

function appendDescription(current: string | null, next: string | null | undefined) {
  const normalizedNext = next?.trim();
  if (!normalizedNext) {
    return current;
  }
  if (!current) {
    return normalizedNext;
  }
  if (current.split('\n\n').includes(normalizedNext)) {
    return current;
  }

  return `${current}\n\n${normalizedNext}`;
}
