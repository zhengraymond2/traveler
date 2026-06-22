import type { Location, PartialLocation, RecognizedLocation } from './location-types';

export type LocationSearchResult = {
  location: Location;
  score: number;
  matchedFields: string[];
};

export type UpsertLocationOptions = {
  partialLocation?: PartialLocation | null;
};

export interface LocationDirectory {
  search(input: PartialLocation): Promise<LocationSearchResult[]>;
  upsertLocation(input: RecognizedLocation, options?: UpsertLocationOptions): Promise<Location>;
}
