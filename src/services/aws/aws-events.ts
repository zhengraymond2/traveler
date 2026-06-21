import type { EventsReader, EventsWriter, PartialLocation, QueuedPartialLocation } from '@/services/contracts';

export class AwsEventsWriter implements EventsWriter {
  async enqueuePartialLocation(_event: PartialLocation): Promise<void> {
    throw new Error('AwsEventsWriter is not configured. Provide SQS queue URL and AWS credentials on the server.');
  }
}

export class AwsEventsReader implements EventsReader {
  async receivePartialLocations(_limit: number): Promise<QueuedPartialLocation[]> {
    throw new Error('AwsEventsReader is not configured. Provide SQS queue URL and AWS credentials on the worker.');
  }

  async ack(_messageId: string): Promise<void> {
    throw new Error('AwsEventsReader is not configured. Provide SQS queue URL and AWS credentials on the worker.');
  }
}
