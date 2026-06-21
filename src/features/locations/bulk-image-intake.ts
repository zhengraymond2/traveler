import type { AddSourceInput } from '@/services/contracts';

export function createBulkImageAddSourceInputs(imageUris: string[]): AddSourceInput[] {
  return imageUris
    .map((uri) => uri.trim())
    .filter(Boolean)
    .map((uri) => ({
      sourcePhotoUris: [uri],
    }));
}
