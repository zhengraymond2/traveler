import type { PartialLocation } from '@/services/contracts';

import {
  AwsEventsReader,
  AwsEventsWriter,
  loadAwsEventsConfigFromEnv,
  type SqsClientLike,
} from '../aws-events';

class FakeCommand {
  constructor(readonly input: Record<string, unknown>) {}
}

const fakeCommands = {
  DeleteMessageCommand: FakeCommand,
  ReceiveMessageCommand: FakeCommand,
  SendMessageCommand: FakeCommand,
};

class FakeSqsClient implements SqsClientLike {
  readonly commands: FakeCommand[] = [];

  constructor(private readonly responses: Record<string, unknown>[] = []) {}

  async send(command: FakeCommand) {
    this.commands.push(command);
    return this.responses.shift() ?? {};
  }
}

const event: PartialLocation = {
  createdAt: '2026-06-21T12:00:00.000Z',
  id: 'partial-1',
  name: 'Great Wall of China',
};

describe('AwsEventsReader/Writer', () => {
  test('loads SQS config from env', () => {
    expect(
      loadAwsEventsConfigFromEnv({
        AWS_REGION: 'us-east-1',
        LOCATION_RECOGNITION_DLQ_URL: 'https://sqs.us-east-1.amazonaws.com/123/dlq',
        LOCATION_RECOGNITION_QUEUE_URL: 'https://sqs.us-east-1.amazonaws.com/123/main',
      })
    ).toEqual({
      deadLetterQueueUrl: 'https://sqs.us-east-1.amazonaws.com/123/dlq',
      queueUrl: 'https://sqs.us-east-1.amazonaws.com/123/main',
      region: 'us-east-1',
    });
  });

  test('writer serializes PartialLocation JSON into SQS', async () => {
    const client = new FakeSqsClient();
    const writer = new AwsEventsWriter(
      { queueUrl: 'https://sqs.us-east-1.amazonaws.com/123/main', region: 'us-east-1' },
      client,
      fakeCommands
    );

    await writer.enqueuePartialLocation(event);

    expect(client.commands[0].input).toEqual({
      MessageBody: JSON.stringify(event),
      QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123/main',
    });
  });

  test('reader maps SQS messages to queued PartialLocation values', async () => {
    const client = new FakeSqsClient([
      {
        Messages: [
          {
            ApproximateReceiveCount: '2',
            Body: JSON.stringify(event),
            MessageId: 'message-1',
            ReceiptHandle: 'receipt-1',
          },
        ],
      },
    ]);
    const reader = new AwsEventsReader(
      { queueUrl: 'https://sqs.us-east-1.amazonaws.com/123/main', region: 'us-east-1' },
      client,
      fakeCommands
    );

    await expect(reader.receivePartialLocations(3)).resolves.toEqual([
      {
        event,
        messageId: 'message-1',
        receiveCount: 2,
        receivedAt: 'message-1',
      },
    ]);
    expect(client.commands[0].input).toMatchObject({
      AttributeNames: ['ApproximateReceiveCount'],
      MaxNumberOfMessages: 3,
      QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123/main',
    });
  });

  test('ack deletes by receipt handle when the message has been received', async () => {
    const client = new FakeSqsClient([
      {
        Messages: [
          {
            Body: JSON.stringify(event),
            MessageId: 'message-1',
            ReceiptHandle: 'receipt-1',
          },
        ],
      },
    ]);
    const reader = new AwsEventsReader(
      { queueUrl: 'https://sqs.us-east-1.amazonaws.com/123/main', region: 'us-east-1' },
      client,
      fakeCommands
    );

    await reader.receivePartialLocations(1);
    await reader.ack('message-1');

    expect(client.commands[1].input).toEqual({
      QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123/main',
      ReceiptHandle: 'receipt-1',
    });
  });
});
