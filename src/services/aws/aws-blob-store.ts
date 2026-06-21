import type { BlobObjectRef, BlobStore, PutSourcePhotoInput } from '@/services/contracts';

export class AwsBlobStore implements BlobStore {
  async putSourcePhoto(_input: PutSourcePhotoInput): Promise<BlobObjectRef> {
    throw new Error('AwsBlobStore is not configured. Provide S3 bucket config on the server.');
  }

  async getObjectUrl(_blobId: string): Promise<string> {
    throw new Error('AwsBlobStore is not configured. Provide S3 bucket config on the server.');
  }
}
