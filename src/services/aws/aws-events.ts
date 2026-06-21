import type { EventsReader, EventsWriter, PartialLocation, QueuedPartialLocation } from '@/services/contracts';

export type AwsEventsConfig = {
  deadLetterQueueUrl?: string;
  queueUrl: string;
  region: string;
};

export type SqsCommand = {
  input: Record<string, unknown>;
};

export type SqsClientLike = {
  send(command: SqsCommand): Promise<Record<string, unknown>>;
};

type SqsCommandConstructor = new (input: Record<string, unknown>) => SqsCommand;

export type SqsCommands = {
  DeleteMessageCommand: SqsCommandConstructor;
  ReceiveMessageCommand: SqsCommandConstructor;
  SendMessageCommand: SqsCommandConstructor;
};

export class AwsEventsWriter implements EventsWriter {
  constructor(
    private readonly config: AwsEventsConfig,
    private readonly client: SqsClientLike,
    private readonly commands: Pick<SqsCommands, 'SendMessageCommand'>
  ) {}

  async enqueuePartialLocation(event: PartialLocation): Promise<void> {
    await this.client.send(
      new this.commands.SendMessageCommand({
        MessageBody: JSON.stringify(event),
        QueueUrl: this.config.queueUrl,
      })
    );
  }

  static async fromEnv(env: Record<string, string | undefined> = readProcessEnv()) {
    const config = loadAwsEventsConfigFromEnv(env);
    const sdk = await import('@aws-sdk/client-sqs');
    return new AwsEventsWriter(config, new sdk.SQSClient({ region: config.region }) as SqsClientLike, {
      SendMessageCommand: sdk.SendMessageCommand as unknown as SqsCommandConstructor,
    });
  }
}

export class AwsEventsReader implements EventsReader {
  private readonly receiptHandlesByMessageId = new Map<string, string>();

  constructor(
    private readonly config: AwsEventsConfig,
    private readonly client: SqsClientLike,
    private readonly commands: Pick<SqsCommands, 'DeleteMessageCommand' | 'ReceiveMessageCommand'>
  ) {}

  async receivePartialLocations(limit: number): Promise<QueuedPartialLocation[]> {
    const response = await this.client.send(
      new this.commands.ReceiveMessageCommand({
        AttributeNames: ['ApproximateReceiveCount'],
        MaxNumberOfMessages: clampReceiveLimit(limit),
        QueueUrl: this.config.queueUrl,
        VisibilityTimeout: 30,
        WaitTimeSeconds: 1,
      })
    );
    const messages = getMessages(response);

    return messages.flatMap((message) => {
      if (!message.MessageId || !message.Body || !message.ReceiptHandle) {
        return [];
      }

      const event = parsePartialLocationMessage(message.Body);
      this.receiptHandlesByMessageId.set(message.MessageId, message.ReceiptHandle);

      return [
        {
          event,
          messageId: message.MessageId,
          receiveCount: Number(message.Attributes?.ApproximateReceiveCount ?? message.ApproximateReceiveCount ?? 1),
          receivedAt: message.MessageId,
        },
      ];
    });
  }

  async ack(messageId: string): Promise<void> {
    const receiptHandle = this.receiptHandlesByMessageId.get(messageId);
    if (!receiptHandle) {
      throw new Error(`Cannot ack SQS message ${messageId}; receive it before acknowledging it.`);
    }

    await this.client.send(
      new this.commands.DeleteMessageCommand({
        QueueUrl: this.config.queueUrl,
        ReceiptHandle: receiptHandle,
      })
    );
    this.receiptHandlesByMessageId.delete(messageId);
  }

  static async fromEnv(env: Record<string, string | undefined> = readProcessEnv()) {
    const config = loadAwsEventsConfigFromEnv(env);
    const sdk = await import('@aws-sdk/client-sqs');
    return new AwsEventsReader(config, new sdk.SQSClient({ region: config.region }) as SqsClientLike, {
      DeleteMessageCommand: sdk.DeleteMessageCommand as unknown as SqsCommandConstructor,
      ReceiveMessageCommand: sdk.ReceiveMessageCommand as unknown as SqsCommandConstructor,
    });
  }
}

export function loadAwsEventsConfigFromEnv(env: Record<string, string | undefined>): AwsEventsConfig {
  const required = ['AWS_REGION', 'LOCATION_RECOGNITION_QUEUE_URL'] as const;
  const missing = required.filter((name) => !env[name]?.trim());
  if (missing.length) {
    throw new Error(`Missing AWS events env vars: ${missing.join(', ')}`);
  }

  return {
    deadLetterQueueUrl: env.LOCATION_RECOGNITION_DLQ_URL?.trim() || undefined,
    queueUrl: env.LOCATION_RECOGNITION_QUEUE_URL as string,
    region: env.AWS_REGION as string,
  };
}

function getMessages(response: Record<string, unknown>) {
  return (Array.isArray(response.Messages) ? response.Messages : []) as {
    Attributes?: Record<string, string>;
    ApproximateReceiveCount?: string;
    Body?: string;
    MessageId?: string;
    ReceiptHandle?: string;
  }[];
}

function parsePartialLocationMessage(body: string): PartialLocation {
  const parsed = JSON.parse(body) as PartialLocation;
  return parsed;
}

function clampReceiveLimit(limit: number) {
  if (!Number.isFinite(limit)) {
    return 1;
  }

  return Math.max(1, Math.min(10, Math.trunc(limit)));
}

function readProcessEnv() {
  const globalWithProcess = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  };

  return globalWithProcess.process?.env ?? {};
}
