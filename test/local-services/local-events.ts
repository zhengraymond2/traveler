import type { EventsReader, EventsWriter, PartialLocation, QueuedPartialLocation } from '@/services/contracts';

export type LocalEventsStore = {
  entries: LocalEventEntry[];
  serializedEvents: string[];
};

type LocalEventEntry = {
  acked: boolean;
  messageId: string;
  receivedAt: string;
  receiveCount: number;
  serializedEvent: string;
};

export function createLocalEventsStore(): LocalEventsStore {
  return {
    entries: [],
    serializedEvents: [],
  };
}

export class LocalEventsWriter implements EventsWriter {
  constructor(private readonly store: LocalEventsStore) {}

  async enqueuePartialLocation(event: PartialLocation): Promise<void> {
    const serializedEvent = JSON.stringify(event);
    this.store.serializedEvents.push(serializedEvent);
    this.store.entries.push({
      acked: false,
      messageId: `local-message-${this.store.entries.length + 1}`,
      receivedAt: new Date().toISOString(),
      receiveCount: 0,
      serializedEvent,
    });
  }
}

export class LocalEventsReader implements EventsReader {
  constructor(private readonly store: LocalEventsStore) {}

  async receivePartialLocations(limit: number): Promise<QueuedPartialLocation[]> {
    return this.store.entries
      .filter((entry) => !entry.acked)
      .slice(0, Math.max(0, limit))
      .map((entry) => {
        entry.receiveCount += 1;
        return {
          messageId: entry.messageId,
          event: JSON.parse(entry.serializedEvent) as PartialLocation,
          receivedAt: entry.receivedAt,
          receiveCount: entry.receiveCount,
        };
      });
  }

  async ack(messageId: string): Promise<void> {
    const entry = this.store.entries.find((candidate) => candidate.messageId === messageId);
    if (entry) {
      entry.acked = true;
    }
  }
}
