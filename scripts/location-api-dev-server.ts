import { createServer } from 'node:http';

import { createStagingLocationServices } from '../src/services/server';

const defaultPort = 8787;

async function main() {
  const port = Number(readProcessEnv().LOCATION_API_PORT ?? defaultPort);
  const { handler } = await createStagingLocationServices(readProcessEnv());

  const server = createServer(async (incoming, outgoing) => {
    try {
      const request = await toRequest(incoming);
      const response = await handler(request);
      outgoing.statusCode = response.status;
      response.headers.forEach((value, key) => {
        outgoing.setHeader(key, value);
      });
      outgoing.end(await response.text());
    } catch (error) {
      outgoing.statusCode = 500;
      outgoing.setHeader('Content-Type', 'application/json');
      outgoing.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Location API failed.' }));
    }
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`Traveler staging location API listening at http://127.0.0.1:${port}`);
  });
}

function toRequest(incoming: import('node:http').IncomingMessage): Promise<Request> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    incoming.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    incoming.on('error', reject);
    incoming.on('end', () => {
      const origin = `http://${incoming.headers.host ?? `127.0.0.1:${defaultPort}`}`;
      resolve(
        new Request(new URL(incoming.url ?? '/', origin), {
          body: incoming.method === 'GET' || incoming.method === 'HEAD' ? undefined : concatBytes(chunks),
          headers: incoming.headers as Record<string, string>,
          method: incoming.method,
        })
      );
    });
  });
}

function concatBytes(chunks: Uint8Array[]) {
  const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }

  return bytes;
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
