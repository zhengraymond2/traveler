import type { PartialLocation } from './location-types';

export type QueuedPartialLocation = {
  messageId: string;
  event: PartialLocation;
  receivedAt: string;
  receiveCount: number;
};

export interface EventsWriter {
  enqueuePartialLocation(event: PartialLocation): Promise<void>;
}

export interface EventsReader {
  receivePartialLocations(limit: number): Promise<QueuedPartialLocation[]>;
  ack(messageId: string): Promise<void>;
}
