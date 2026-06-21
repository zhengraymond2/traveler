import type {
  LocalLocation,
  LocalLocationStatus,
  LocalLocationStore,
  PartialLocation,
  UpsertLocalLocationInput,
} from '@/services/contracts';

export class LocalLocalLocationStore implements LocalLocationStore {
  private records: LocalLocation[];

  constructor(seedRecords: LocalLocation[] = []) {
    this.records = [...seedRecords];
  }

  async upsertFromPartialLocation(input: UpsertLocalLocationInput): Promise<LocalLocation> {
    const existing = this.findMatchingRecord(input.partialLocation);
    const now = new Date().toISOString();

    if (existing) {
      const updated: LocalLocation = {
        ...existing,
        canonicalLocationId: input.canonicalLocationId ?? existing.canonicalLocationId,
        status: input.status,
        sourcePhotoUris: mergeUnique(existing.sourcePhotoUris, input.partialLocation.sourcePhotoUris),
        sourceLinks: mergeUnique(existing.sourceLinks, collectSourceLinks(input.partialLocation)),
        sourceInstagramUrls: mergeUnique(existing.sourceInstagramUrls, input.partialLocation.instagramUrls),
        privateDescription: input.source.privateDescription?.trim() || existing.privateDescription,
        lastPartialLocationId: input.partialLocation.id,
        updatedAt: now,
      };
      this.records = this.records.map((record) => (record.id === existing.id ? updated : record));
      return updated;
    }

    const created: LocalLocation = {
      id: `local-location-${this.records.length + 1}`,
      canonicalLocationId: input.canonicalLocationId ?? null,
      status: input.status,
      sourcePhotoUris: mergeUnique([], input.partialLocation.sourcePhotoUris),
      sourceLinks: collectSourceLinks(input.partialLocation),
      sourceInstagramUrls: mergeUnique([], input.partialLocation.instagramUrls),
      privateDescription: input.source.privateDescription?.trim() || null,
      lastPartialLocationId: input.partialLocation.id,
      addedAt: now,
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
            updatedAt: new Date().toISOString(),
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
            updatedAt: new Date().toISOString(),
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
    return this.records.find((record) => {
      return (
        intersects(record.sourcePhotoUris, partialLocation.sourcePhotoUris) ||
        intersects(record.sourceInstagramUrls, partialLocation.instagramUrls) ||
        intersects(record.sourceLinks, sourceLinks)
      );
    });
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
