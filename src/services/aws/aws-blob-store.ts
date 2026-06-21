import type { BlobObjectRef, BlobStore, PutSourcePhotoInput } from '@/services/contracts';

export type AwsBlobStoreConfig = {
  bucket: string;
  region: string;
  signedUrlExpiresInSeconds?: number;
};

export type S3Command = {
  input: Record<string, unknown>;
};

export type S3ClientLike = {
  send(command: S3Command): Promise<Record<string, unknown>>;
};

type S3CommandConstructor = new (input: Record<string, unknown>) => S3Command;

export type S3Commands = {
  DeleteObjectCommand: S3CommandConstructor;
  GetObjectCommand: S3CommandConstructor;
  PutObjectCommand: S3CommandConstructor;
};

type SignedUrlFactory = (client: S3ClientLike, command: S3Command, options?: { expiresIn?: number }) => Promise<string>;

type AwsBlobStoreOptions = {
  createId?: () => string;
  now?: () => Date;
};

export class AwsBlobStore implements BlobStore {
  private readonly createId: () => string;
  private readonly now: () => Date;

  constructor(
    private readonly config: AwsBlobStoreConfig,
    private readonly client: S3ClientLike,
    private readonly commands: S3Commands,
    private readonly getSignedUrl: SignedUrlFactory = async () => {
      throw new Error('AwsBlobStore cannot create signed URLs until the S3 presigner is configured.');
    },
    options: AwsBlobStoreOptions = {}
  ) {
    this.createId = options.createId ?? createObjectId;
    this.now = options.now ?? (() => new Date());
  }

  async putSourcePhoto(input: PutSourcePhotoInput): Promise<BlobObjectRef> {
    const object = await readSourceObject(input);
    const blobId = this.createSourcePhotoKey(input.fileName, this.createId(), this.now());

    await this.client.send(
      new this.commands.PutObjectCommand({
        Body: object.body,
        Bucket: this.config.bucket,
        ContentType: input.contentType ?? object.contentType ?? 'application/octet-stream',
        Key: blobId,
        ServerSideEncryption: 'AES256',
      })
    );

    return {
      blobId,
      url: await this.getObjectUrl(blobId),
    };
  }

  async getObjectUrl(blobId: string): Promise<string> {
    return this.getSignedUrl(
      this.client,
      new this.commands.GetObjectCommand({
        Bucket: this.config.bucket,
        Key: blobId,
      }),
      { expiresIn: this.config.signedUrlExpiresInSeconds ?? 900 }
    );
  }

  async deleteObject(blobId: string): Promise<void> {
    await this.client.send(
      new this.commands.DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: blobId,
      })
    );
  }

  static async fromEnv(env: Record<string, string | undefined> = readProcessEnv()) {
    const config = loadAwsBlobStoreConfigFromEnv(env);
    const s3 = await import('@aws-sdk/client-s3');
    const presigner = await import('@aws-sdk/s3-request-presigner');
    return new AwsBlobStore(config, new s3.S3Client({ region: config.region }) as S3ClientLike, {
      DeleteObjectCommand: s3.DeleteObjectCommand as unknown as S3CommandConstructor,
      GetObjectCommand: s3.GetObjectCommand as unknown as S3CommandConstructor,
      PutObjectCommand: s3.PutObjectCommand as unknown as S3CommandConstructor,
    }, presigner.getSignedUrl as unknown as SignedUrlFactory);
  }

  private createSourcePhotoKey(fileName: string | null | undefined, id: string, now: Date) {
    const year = now.getUTCFullYear().toString();
    const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = now.getUTCDate().toString().padStart(2, '0');
    const safeName = getSafeBaseName(fileName);
    const extension = getSafeExtension(fileName);
    return `source-photos/${year}/${month}/${day}/${id}${safeName ? `-${safeName}` : ''}${extension}`;
  }
}

export function loadAwsBlobStoreConfigFromEnv(env: Record<string, string | undefined>): AwsBlobStoreConfig {
  const required = ['AWS_REGION', 'LOCATION_BLOB_BUCKET'] as const;
  const missing = required.filter((name) => !env[name]?.trim());
  if (missing.length) {
    throw new Error(`Missing AWS blob store env vars: ${missing.join(', ')}`);
  }

  return {
    bucket: env.LOCATION_BLOB_BUCKET as string,
    region: env.AWS_REGION as string,
  };
}

async function readSourceObject(input: PutSourcePhotoInput): Promise<{ body: Uint8Array; contentType: string | null }> {
  if (input.localUri.startsWith('data:')) {
    return readDataUri(input.localUri);
  }

  throw new Error('AwsBlobStore currently accepts data URI uploads. Add multipart/file upload handling before using device file URIs.');
}

function readDataUri(uri: string): { body: Uint8Array; contentType: string | null } {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(uri);
  if (!match) {
    throw new Error('Invalid data URI source photo.');
  }

  const [, contentType = null, encoding, value] = match;
  if (encoding === ';base64') {
    return {
      body: base64ToBytes(value),
      contentType,
    };
  }

  return {
    body: textToBytes(decodeURIComponent(value)),
    contentType,
  };
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function textToBytes(value: string) {
  return new TextEncoder().encode(value);
}

function getSafeExtension(fileName: string | null | undefined) {
  const match = /\.(jpe?g|png|webp|heic|gif)$/i.exec(fileName ?? '');
  return match ? `.${match[1].toLowerCase().replace('jpeg', 'jpg')}` : '';
}

function getSafeBaseName(fileName: string | null | undefined) {
  const value = fileName?.replace(/\.[^.]+$/, '') ?? '';
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function createObjectId() {
  return `photo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readProcessEnv() {
  const globalWithProcess = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  };

  return globalWithProcess.process?.env ?? {};
}
