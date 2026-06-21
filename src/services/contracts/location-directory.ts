import type { Location, PartialLocation, RecognizedLocation } from './location-types';

export type LocationSearchResult = {
  location: Location;
  score: number;
  matchedFields: string[];
};

export interface LocationDirectory {
  search(input: PartialLocation): Promise<LocationSearchResult[]>;
  upsertLocation(input: RecognizedLocation): Promise<Location>;
}
