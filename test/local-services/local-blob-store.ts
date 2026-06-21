import type { BlobObjectRef, BlobStore, PutSourcePhotoInput } from '@/services/contracts';

export class LocalBlobStore implements BlobStore {
  private readonly objects = new Map<string, PutSourcePhotoInput>();

  async putSourcePhoto(input: PutSourcePhotoInput): Promise<BlobObjectRef> {
    const blobId = `local-blob-${this.objects.size + 1}`;
    this.objects.set(blobId, input);
    return {
      blobId,
      url: input.localUri,
    };
  }

  async getObjectUrl(blobId: string): Promise<string> {
    const object = this.objects.get(blobId);
    if (!object) {
      throw new Error(`Local blob not found: ${blobId}`);
    }

    return object.localUri;
  }
}
