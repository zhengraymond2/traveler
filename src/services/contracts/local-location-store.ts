import type { AddSourceInput, LocalLocation, LocalLocationStatus, PartialLocation } from './location-types';

export type UpsertLocalLocationInput = {
  partialLocation: PartialLocation;
  source: AddSourceInput;
  status: LocalLocationStatus;
  canonicalLocationId?: string | null;
};

export interface LocalLocationStore {
  upsertFromPartialLocation(input: UpsertLocalLocationInput): Promise<LocalLocation>;
  linkCanonicalLocation(localLocationId: string, locationId: string): Promise<void>;
  updateStatus(localLocationId: string, status: LocalLocationStatus): Promise<void>;
  findByPartialLocation(partialLocation: PartialLocation): Promise<LocalLocation | null>;
}
