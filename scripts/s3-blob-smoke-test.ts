import { AwsBlobStore } from '../src/services/aws/aws-blob-store';

const smokeBody = `traveler s3 smoke ${new Date().toISOString()}`;

async function main() {
  const store = await AwsBlobStore.fromEnv(readProcessEnv());
  const result = await store.putSourcePhoto({
    contentType: 'text/plain',
    fileName: 's3-smoke.txt',
    localUri: `data:text/plain,${encodeURIComponent(smokeBody)}`,
  });

  const url = await store.getObjectUrl(result.blobId);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Signed URL fetch failed with HTTP ${response.status}.`);
  }
  const text = await response.text();
  if (text !== smokeBody) {
    throw new Error('Signed URL returned different content than the uploaded smoke object.');
  }

  await store.deleteObject(result.blobId);

  console.log(
    JSON.stringify(
      {
        blobId: result.blobId,
        deleted: true,
        fetched: true,
      },
      null,
      2
    )
  );
}

function readProcessEnv() {
  const globalWithProcess = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined>; exitCode?: number };
  };

  return globalWithProcess.process?.env ?? {};
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  const globalWithProcess = globalThis as typeof globalThis & {
    process?: { exitCode?: number };
  };
  if (globalWithProcess.process) {
    globalWithProcess.process.exitCode = 1;
  }
});
