import type { PartialLocation } from '../src/services/contracts';
import { AwsEventsReader, AwsEventsWriter } from '../src/services/aws/aws-events';

const smokeEvent: PartialLocation = {
  createdAt: new Date().toISOString(),
  id: `partial-sqs-smoke-${Date.now().toString(36)}`,
  name: 'SQS Smoke Test Location',
};

async function main() {
  const env = readProcessEnv();
  const writer = await AwsEventsWriter.fromEnv(env);
  const reader = await AwsEventsReader.fromEnv(env);

  await writer.enqueuePartialLocation(smokeEvent);
  const messages = await receiveUntilSmokeMessage(reader, smokeEvent.id);
  const smokeMessage = messages.find((message) => message.event.id === smokeEvent.id);
  if (!smokeMessage) {
    throw new Error(`Sent ${smokeEvent.id}, but did not receive it back from SQS.`);
  }

  await reader.ack(smokeMessage.messageId);
  console.log(
    JSON.stringify(
      {
        messageId: smokeMessage.messageId,
        partialLocationId: smokeMessage.event.id,
        received: true,
      },
      null,
      2
    )
  );
}

async function receiveUntilSmokeMessage(reader: AwsEventsReader, partialLocationId: string) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const messages = await reader.receivePartialLocations(5);
    if (messages.some((message) => message.event.id === partialLocationId)) {
      return messages;
    }
    await sleep(1000);
  }

  return [];
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
