import type {
  Location,
  LocationDirectory,
  LocationSearchResult,
  PartialLocation,
  RecognizedLocation,
} from '@/services/contracts';

export class AwsLocationDirectory implements LocationDirectory {
  async search(_input: PartialLocation): Promise<LocationSearchResult[]> {
    throw new Error('AwsLocationDirectory is not configured. Provide the RDB/API connection on the server.');
  }

  async upsertLocation(_input: RecognizedLocation): Promise<Location> {
    throw new Error('AwsLocationDirectory is not configured. Provide the RDB/API connection on the server.');
  }
}
