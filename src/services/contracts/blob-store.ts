export type PutSourcePhotoInput = {
  localUri: string;
  contentType?: string | null;
  fileName?: string | null;
};

export type BlobObjectRef = {
  blobId: string;
  url?: string | null;
};

export interface BlobStore {
  putSourcePhoto(input: PutSourcePhotoInput): Promise<BlobObjectRef>;
  getObjectUrl(blobId: string): Promise<string>;
}
