import { AwsBlobStore, loadAwsBlobStoreConfigFromEnv, type S3ClientLike } from '../aws-blob-store';

class FakeCommand {
  constructor(readonly input: Record<string, unknown>) {}
}

const fakeCommands = {
  DeleteObjectCommand: FakeCommand,
  GetObjectCommand: FakeCommand,
  PutObjectCommand: FakeCommand,
};

class FakeS3Client implements S3ClientLike {
  readonly commands: FakeCommand[] = [];

  async send(command: FakeCommand) {
    this.commands.push(command);
    return {};
  }
}

describe('AwsBlobStore', () => {
  test('loads bucket config from env', () => {
    expect(
      loadAwsBlobStoreConfigFromEnv({
        AWS_REGION: 'us-east-1',
        LOCATION_BLOB_BUCKET: 'traveler-staging',
      })
    ).toEqual({
      bucket: 'traveler-staging',
      region: 'us-east-1',
    });
  });

  test('uploads source photos privately with deterministic keys', async () => {
    const client = new FakeS3Client();
    const store = new AwsBlobStore(
      { bucket: 'traveler-staging', region: 'us-east-1' },
      client,
      fakeCommands,
      async () => 'https://signed.example/source-photo',
      {
        createId: () => 'photo-1',
        now: () => new Date('2026-06-21T12:00:00.000Z'),
      }
    );

    await expect(
      store.putSourcePhoto({
        contentType: 'image/jpeg',
        fileName: 'great-wall.jpg',
        localUri: 'data:image/jpeg;base64,aGVsbG8=',
      })
    ).resolves.toEqual({
      blobId: 'source-photos/2026/06/21/photo-1-great-wall.jpg',
      url: 'https://signed.example/source-photo',
    });
    expect(client.commands[0].input).toMatchObject({
      Bucket: 'traveler-staging',
      ContentType: 'image/jpeg',
      Key: 'source-photos/2026/06/21/photo-1-great-wall.jpg',
      ServerSideEncryption: 'AES256',
    });
    expect(client.commands[0].input.Body).toBeInstanceOf(Uint8Array);
  });

  test('creates signed URLs for private objects', async () => {
    const client = new FakeS3Client();
    const store = new AwsBlobStore(
      { bucket: 'traveler-staging', region: 'us-east-1' },
      client,
      fakeCommands,
      async (s3Client, command) => {
        expect(s3Client).toBe(client);
        expect(command.input).toEqual({
          Bucket: 'traveler-staging',
          Key: 'source-photos/photo-1.jpg',
        });
        return 'https://signed.example/photo-1.jpg';
      }
    );

    await expect(store.getObjectUrl('source-photos/photo-1.jpg')).resolves.toBe('https://signed.example/photo-1.jpg');
  });

  test('can delete smoke-test objects by key', async () => {
    const client = new FakeS3Client();
    const store = new AwsBlobStore({ bucket: 'traveler-staging', region: 'us-east-1' }, client, fakeCommands);

    await store.deleteObject('source-photos/photo-1.jpg');

    expect(client.commands[0].input).toEqual({
      Bucket: 'traveler-staging',
      Key: 'source-photos/photo-1.jpg',
    });
  });
});
