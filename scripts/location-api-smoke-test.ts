import { AwsEventsReader } from '../src/services/aws/aws-events';
import { createStagingLocationServices } from '../src/services/server';

async function main() {
  const env = readProcessEnv();
  const { handler } = await createStagingLocationServices(env);
  const reader = await AwsEventsReader.fromEnv(env);
  const smokeName = `API Smoke Test Location ${Date.now().toString(36)}`;

  const response = await handler(
    new Request('http://127.0.0.1:8787/sources', {
      body: JSON.stringify({
        name: smokeName,
        textCaption: 'Created by the Traveler staging API smoke test.',
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
  );
  if (!response.ok) {
    throw new Error(`Location API smoke request failed with HTTP ${response.status}: ${await response.text()}`);
  }
  const result = (await response.json()) as {
    emittedEvent: { id: string } | null;
    processingCount: number;
  };
  if (!result.emittedEvent || result.processingCount !== 1) {
    throw new Error(`Expected unmatched source to emit one processing event, got ${JSON.stringify(result)}.`);
  }

  const message = await receiveEvent(reader, result.emittedEvent.id);
  await reader.ack(message.messageId);

  console.log(
    JSON.stringify(
      {
        emittedPartialLocationId: result.emittedEvent.id,
        queuedMessageId: message.messageId,
        sourceName: smokeName,
      },
      null,
      2
    )
  );
}

async function receiveEvent(reader: AwsEventsReader, partialLocationId: string) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const messages = await reader.receivePartialLocations(5);
    const match = messages.find((message) => message.event.id === partialLocationId);
    if (match) {
      return match;
    }
    await sleep(1000);
  }

  throw new Error(`Did not receive emitted event ${partialLocationId} from SQS.`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
