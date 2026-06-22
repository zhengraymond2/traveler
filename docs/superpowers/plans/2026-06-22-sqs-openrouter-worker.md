# SQS OpenRouter Worker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first deployable backend worker path that consumes SQS location-recognition messages, calls OpenRouter, and stores results in Aurora.

**Architecture:** Add a durable recognition job store beside the existing SQL location directory, then refactor the worker around a single queued-message processor that both polling scripts and Lambda can reuse. The Lambda entrypoint adapts SQS event records into the shared worker core and returns partial batch failures for retryable records.

**Tech Stack:** Expo SDK 56 repo, TypeScript, Jest, AWS SQS, AWS Lambda SQS event source mapping, Aurora PostgreSQL through RDS Data API, OpenRouter chat completions.

## Global Constraints

- Before editing Expo app code, read the exact SDK docs at `https://docs.expo.dev/versions/v56.0.0/`.
- Keep OpenRouter and AWS credentials server-side only.
- Do not use `EXPO_PUBLIC_*` variables for secrets.
- Acknowledge/delete SQS messages only after worker processing succeeds.
- Let transient OpenRouter, parsing, and Aurora failures retry through SQS visibility timeout and redrive policy.
- Keep SQS messages small; real image traffic must use durable blob URLs or IDs, not device-local `file://` URIs.
- Preserve unrelated dirty worktree changes.

---

## File Structure

- `src/services/contracts/recognition-job-store.ts`: shared recognition job/result types and store interface.
- `src/services/contracts/index.ts`: exports the new contract.
- `src/services/db/sql-recognition-job-store.ts`: Aurora/PostgreSQL implementation of the recognition job store.
- `src/services/db/sql-location-schema.ts`: adds `recognition_jobs` table creation to the existing Aurora schema initializer.
- `src/services/db/index.ts`: exports the SQL recognition job store.
- `src/services/location-intake/location-intake-service.ts`: creates a `processing` job row before queueing unmatched sources.
- `src/services/location-worker/location-worker.ts`: extracts single-message processing and updates recognition job status.
- `src/services/location-worker/lambda-handler.ts`: Lambda SQS event adapter with partial batch response.
- `src/services/location-worker/aws-worker-deps.ts`: builds worker dependencies from server-side environment variables.
- `scripts/location-worker-openrouter-smoke-test.ts`: credential-gated paid smoke command using the real recognizer.
- `package.json`: adds a smoke script for the real recognizer.

---

### Task 1: Recognition Job Store Contract And SQL Implementation

**Files:**
- Create: `src/services/contracts/recognition-job-store.ts`
- Modify: `src/services/contracts/index.ts`
- Create: `src/services/db/sql-recognition-job-store.ts`
- Modify: `src/services/db/sql-location-schema.ts`
- Modify: `src/services/db/index.ts`
- Test: `src/services/db/__tests__/sql-recognition-job-store-test.ts`

**Interfaces:**
- Consumes: `DatabaseClient`, `PartialLocation`, `RecognizedLocation`, and `Location` from `src/services/contracts`.
- Produces:
  - `RecognitionJobStatus = 'processing' | 'matched' | 'needsReview' | 'failed'`
  - `RecognitionJob`
  - `RecognitionJobStore`
  - `SqlRecognitionJobStore`

- [ ] **Step 1: Write the failing SQL store test**

Create `src/services/db/__tests__/sql-recognition-job-store-test.ts`:

```ts
import type { DatabaseClient, DatabaseResult, DatabaseRow, DatabaseStatement, DatabaseTransaction } from '@/services/contracts';

import { SqlRecognitionJobStore } from '../sql-recognition-job-store';
import { sqlLocationDirectorySchemaStatements } from '../sql-location-schema';

class RecordingDatabase implements DatabaseClient {
  readonly statements: DatabaseStatement[] = [];

  constructor(private readonly results: DatabaseResult[] = []) {}

  async execute<Row extends DatabaseRow = DatabaseRow>(statement: DatabaseStatement): Promise<DatabaseResult<Row>> {
    this.statements.push(statement);
    return (this.results.shift() ?? { rows: [] }) as DatabaseResult<Row>;
  }

  async transaction<Result>(operation: (transaction: DatabaseTransaction) => Promise<Result>): Promise<Result> {
    return operation({
      execute: (statement) => this.execute(statement),
      commit: async () => undefined,
      rollback: async () => undefined,
    });
  }
}

describe('SqlRecognitionJobStore', () => {
  test('schema creates recognition_jobs table', () => {
    expect(sqlLocationDirectorySchemaStatements.join('\n')).toContain('create table if not exists recognition_jobs');
    expect(sqlLocationDirectorySchemaStatements.join('\n')).toContain('partial_location_id text primary key');
  });

  test('creates a processing recognition job', async () => {
    const database = new RecordingDatabase();
    const store = new SqlRecognitionJobStore(database, {
      now: () => new Date('2026-06-22T12:00:00.000Z'),
    });

    await store.createProcessing({
      createdAt: '2026-06-22T12:00:00.000Z',
      id: 'partial-1',
      name: 'Great Wall of China',
    });

    expect(database.statements[0].sql).toContain('insert into recognition_jobs');
    expect(database.statements[0].parameters).toMatchObject({
      partialLocationId: 'partial-1',
      status: 'processing',
    });
  });

  test('marks a job matched with canonical location and recognized JSON', async () => {
    const database = new RecordingDatabase();
    const store = new SqlRecognitionJobStore(database, {
      now: () => new Date('2026-06-22T12:00:00.000Z'),
    });

    await store.markMatched('partial-1', {
      location: {
        allTrailsUrl: null,
        createdAt: '2026-06-22T12:00:00.000Z',
        fieldConfidenceJson: '{"name":0.99}',
        googleMapsUrl: null,
        id: 'location-great-wall',
        instagramFeedUrl: null,
        latitude: 40.4319,
        longitude: 116.5704,
        name: 'Great Wall of China',
        updatedAt: '2026-06-22T12:00:00.000Z',
      },
      recognizedLocation: {
        allTrailsUrl: null,
        fieldConfidence: { name: 0.99 },
        googleMapsUrl: null,
        instagramFeedUrl: null,
        latitude: 40.4319,
        longitude: 116.5704,
        name: 'Great Wall of China',
      },
    });

    expect(database.statements[0].sql).toContain('status = :status');
    expect(database.statements[0].parameters).toMatchObject({
      canonicalLocationId: 'location-great-wall',
      partialLocationId: 'partial-1',
      status: 'matched',
    });
    expect(String(database.statements[0].parameters?.recognizedLocationJson)).toContain('Great Wall of China');
  });

  test('marks a job as needsReview or failed with a reason', async () => {
    const database = new RecordingDatabase();
    const store = new SqlRecognitionJobStore(database, {
      now: () => new Date('2026-06-22T12:00:00.000Z'),
    });

    await store.markNeedsReview('partial-1', {
      reason: 'OpenRouter returned a low-confidence location name.',
      recognizedLocation: {
        allTrailsUrl: null,
        fieldConfidence: { name: 0.5 },
        googleMapsUrl: null,
        instagramFeedUrl: null,
        latitude: null,
        longitude: null,
        name: 'Possible Place',
      },
    });
    await store.markFailed('partial-2', 'Invalid message body.');

    expect(database.statements[0].parameters).toMatchObject({
      failureReason: 'OpenRouter returned a low-confidence location name.',
      partialLocationId: 'partial-1',
      status: 'needsReview',
    });
    expect(database.statements[1].parameters).toMatchObject({
      failureReason: 'Invalid message body.',
      partialLocationId: 'partial-2',
      status: 'failed',
    });
  });
});
```

- [ ] **Step 2: Run the failing test**

Run: `npm test -- --runTestsByPath src/services/db/__tests__/sql-recognition-job-store-test.ts --runInBand`

Expected: FAIL because `SqlRecognitionJobStore` and `recognition_jobs` schema do not exist.

- [ ] **Step 3: Add the contract**

Create `src/services/contracts/recognition-job-store.ts`:

```ts
import type { Location, PartialLocation, RecognizedLocation } from './location-types';

export type RecognitionJobStatus = 'processing' | 'matched' | 'needsReview' | 'failed';

export type RecognitionJob = {
  canonicalLocationId: string | null;
  createdAt: string;
  failureReason: string | null;
  partialLocationId: string;
  recognizedLocationJson: string | null;
  status: RecognitionJobStatus;
  updatedAt: string;
};

export type MarkMatchedRecognitionJobInput = {
  location: Location;
  recognizedLocation: RecognizedLocation;
};

export type MarkNeedsReviewRecognitionJobInput = {
  reason: string;
  recognizedLocation: RecognizedLocation;
};

export interface RecognitionJobStore {
  createProcessing(partialLocation: PartialLocation): Promise<void>;
  markMatched(partialLocationId: string, input: MarkMatchedRecognitionJobInput): Promise<void>;
  markNeedsReview(partialLocationId: string, input: MarkNeedsReviewRecognitionJobInput): Promise<void>;
  markFailed(partialLocationId: string, reason: string): Promise<void>;
}
```

Modify `src/services/contracts/index.ts`:

```ts
export * from './blob-store';
export * from './database';
export * from './events';
export * from './local-location-store';
export * from './location-directory';
export * from './location-recognizer';
export * from './location-types';
export * from './recognition-job-store';
```

- [ ] **Step 4: Add schema statements**

Append these entries to `sqlLocationDirectorySchemaStatements` in `src/services/db/sql-location-schema.ts` after `location_instagram_links` indexes:

```ts
  `
    create table if not exists recognition_jobs (
      partial_location_id text primary key,
      status text not null,
      canonical_location_id text references locations(id) on delete set null,
      failure_reason text,
      recognized_location_json text,
      created_at timestamptz not null,
      updated_at timestamptz not null
    )
  `,
  'create index if not exists recognition_jobs_status_idx on recognition_jobs (status)',
  'create index if not exists recognition_jobs_canonical_location_id_idx on recognition_jobs (canonical_location_id)',
```

- [ ] **Step 5: Implement the SQL store**

Create `src/services/db/sql-recognition-job-store.ts`:

```ts
import type {
  DatabaseClient,
  MarkMatchedRecognitionJobInput,
  MarkNeedsReviewRecognitionJobInput,
  PartialLocation,
  RecognitionJobStore,
} from '@/services/contracts';

export type SqlRecognitionJobStoreOptions = {
  now?: () => Date;
};

export class SqlRecognitionJobStore implements RecognitionJobStore {
  private readonly now: () => Date;

  constructor(
    private readonly database: DatabaseClient,
    options: SqlRecognitionJobStoreOptions = {}
  ) {
    this.now = options.now ?? (() => new Date());
  }

  async createProcessing(partialLocation: PartialLocation): Promise<void> {
    const now = this.now().toISOString();
    await this.database.execute({
      sql: `
        insert into recognition_jobs (
          partial_location_id,
          status,
          canonical_location_id,
          failure_reason,
          recognized_location_json,
          created_at,
          updated_at
        )
        values (
          :partialLocationId,
          :status,
          null,
          null,
          null,
          cast(:now as timestamptz),
          cast(:now as timestamptz)
        )
        on conflict (partial_location_id) do update set
          status = excluded.status,
          failure_reason = null,
          updated_at = excluded.updated_at
      `,
      parameters: {
        now,
        partialLocationId: partialLocation.id,
        status: 'processing',
      },
    });
  }

  async markMatched(partialLocationId: string, input: MarkMatchedRecognitionJobInput): Promise<void> {
    await this.updateJob({
      canonicalLocationId: input.location.id,
      failureReason: null,
      partialLocationId,
      recognizedLocationJson: JSON.stringify(input.recognizedLocation),
      status: 'matched',
    });
  }

  async markNeedsReview(partialLocationId: string, input: MarkNeedsReviewRecognitionJobInput): Promise<void> {
    await this.updateJob({
      canonicalLocationId: null,
      failureReason: input.reason,
      partialLocationId,
      recognizedLocationJson: JSON.stringify(input.recognizedLocation),
      status: 'needsReview',
    });
  }

  async markFailed(partialLocationId: string, reason: string): Promise<void> {
    await this.updateJob({
      canonicalLocationId: null,
      failureReason: reason,
      partialLocationId,
      recognizedLocationJson: null,
      status: 'failed',
    });
  }

  private async updateJob(input: {
    canonicalLocationId: string | null;
    failureReason: string | null;
    partialLocationId: string;
    recognizedLocationJson: string | null;
    status: string;
  }) {
    await this.database.execute({
      sql: `
        update recognition_jobs set
          status = :status,
          canonical_location_id = :canonicalLocationId,
          failure_reason = :failureReason,
          recognized_location_json = :recognizedLocationJson,
          updated_at = cast(:now as timestamptz)
        where partial_location_id = :partialLocationId
      `,
      parameters: {
        ...input,
        now: this.now().toISOString(),
      },
    });
  }
}
```

Modify `src/services/db/index.ts`:

```ts
export * from './sql-location-directory';
export * from './sql-location-schema';
export * from './sql-recognition-job-store';
```

- [ ] **Step 6: Run the focused test**

Run: `npm test -- --runTestsByPath src/services/db/__tests__/sql-recognition-job-store-test.ts --runInBand`

Expected: PASS.

- [ ] **Step 7: Run typecheck**

Run: `npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 8: Commit**

Run:

```bash
git add src/services/contracts/recognition-job-store.ts src/services/contracts/index.ts src/services/db/sql-recognition-job-store.ts src/services/db/sql-location-schema.ts src/services/db/index.ts src/services/db/__tests__/sql-recognition-job-store-test.ts
git commit -m "feat: add recognition job store"
```

---

### Task 2: Create Processing Jobs During Intake

**Files:**
- Modify: `src/services/location-intake/location-intake-service.ts`
- Test: `src/services/location-intake/__tests__/location-intake-service-test.ts`

**Interfaces:**
- Consumes: `RecognitionJobStore.createProcessing(partialLocation: PartialLocation): Promise<void>`.
- Produces: `LocationIntakeServiceDeps.recognitionJobStore?: RecognitionJobStore`.

- [ ] **Step 1: Add a failing intake test**

In `src/services/location-intake/__tests__/location-intake-service-test.ts`, add:

```ts
test('creates a processing recognition job before enqueueing unmatched sources', async () => {
  const calls: string[] = [];
  const service = createLocationIntakeService({
    createId: () => 'partial-1',
    eventsWriter: {
      async enqueuePartialLocation() {
        calls.push('enqueue');
      },
    },
    localLocationStore: new LocalLocalLocationStore(),
    locationDirectory: new LocalLocationDirectory(),
    now: () => new Date('2026-06-22T12:00:00.000Z'),
    recognitionJobStore: {
      async createProcessing(partialLocation) {
        calls.push(`processing:${partialLocation.id}`);
      },
      async markFailed() {
        throw new Error('markFailed should not be called by intake.');
      },
      async markMatched() {
        throw new Error('markMatched should not be called by intake.');
      },
      async markNeedsReview() {
        throw new Error('markNeedsReview should not be called by intake.');
      },
    },
  });

  await service.addSource({ name: 'Unmatched Place' });

  expect(calls).toEqual(['processing:partial-1', 'enqueue']);
});
```

- [ ] **Step 2: Run the failing intake test**

Run: `npm test -- --runTestsByPath src/services/location-intake/__tests__/location-intake-service-test.ts --runInBand`

Expected: FAIL because `recognitionJobStore` is not part of `LocationIntakeServiceDeps`.

- [ ] **Step 3: Add the dependency and call**

Modify `src/services/location-intake/location-intake-service.ts` imports:

```ts
import type {
  AddSourceInput,
  AddSourceResult,
  EventsWriter,
  LocalLocationStore,
  LocationDirectory,
  PartialLocation,
  RecognitionJobStore,
} from '@/services/contracts';
```

Modify `LocationIntakeServiceDeps`:

```ts
export type LocationIntakeServiceDeps = {
  createId?: () => string;
  eventsWriter: EventsWriter;
  localLocationStore: LocalLocationStore;
  locationDirectory: LocationDirectory;
  now?: () => Date;
  recognitionJobStore?: RecognitionJobStore;
};
```

Before `await deps.eventsWriter.enqueuePartialLocation(partialLocation);`, add:

```ts
      await deps.recognitionJobStore?.createProcessing(partialLocation);
```

- [ ] **Step 4: Run the focused test**

Run: `npm test -- --runTestsByPath src/services/location-intake/__tests__/location-intake-service-test.ts --runInBand`

Expected: PASS.

- [ ] **Step 5: Run typecheck**

Run: `npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/services/location-intake/location-intake-service.ts src/services/location-intake/__tests__/location-intake-service-test.ts
git commit -m "feat: record processing recognition jobs"
```

---

### Task 3: Refactor Worker Core Around One Queued Message

**Files:**
- Modify: `src/services/location-worker/location-worker.ts`
- Test: `src/services/location-worker/__tests__/location-worker-test.ts`

**Interfaces:**
- Consumes: `RecognitionJobStore`, `QueuedPartialLocation`, `LocationRecognizer`, `LocationDirectory`, `LocalLocationStore`.
- Produces:
  - `processQueuedPartialLocation(deps, message): Promise<QueuedLocationWorkerResult>`
  - retryable failures are returned without acknowledging the message.

- [ ] **Step 1: Add failing worker tests**

In `src/services/location-worker/__tests__/location-worker-test.ts`, add:

```ts
test('marks recognition job matched after successful processing', async () => {
  const statuses: string[] = [];
  const eventStore = createLocalEventsStore();
  const eventsWriter = new LocalEventsWriter(eventStore);
  const eventsReader = new LocalEventsReader(eventStore);
  const localLocationStore = new LocalLocalLocationStore();
  const locationDirectory = new LocalLocationDirectory();
  await localLocationStore.upsertFromPartialLocation({
    partialLocation: greatWallSourceFixture,
    source: { sourcePhotoUris: greatWallSourceFixture.sourcePhotoUris },
    status: 'processing',
  });
  await eventsWriter.enqueuePartialLocation(greatWallSourceFixture);

  const result = await processNextPartialLocations({
    eventsReader,
    locationDirectory,
    localLocationStore,
    recognizer: new FakeLocationRecognizer(),
    recognitionJobStore: {
      async createProcessing() {
        throw new Error('createProcessing should not be called by worker.');
      },
      async markFailed() {
        throw new Error('markFailed should not be called for recognized output.');
      },
      async markMatched(partialLocationId, input) {
        statuses.push(`matched:${partialLocationId}:${input.location.id}`);
      },
      async markNeedsReview() {
        throw new Error('markNeedsReview should not be called for recognized output.');
      },
    },
  });

  expect(result).toMatchObject({ acknowledged: 1, matched: 1, processed: 1 });
  expect(statuses).toEqual(['matched:partial-great-wall-source:location-1']);
});

test('leaves retryable recognizer failures unacknowledged', async () => {
  const eventStore = createLocalEventsStore();
  const eventsWriter = new LocalEventsWriter(eventStore);
  const eventsReader = new LocalEventsReader(eventStore);
  await eventsWriter.enqueuePartialLocation(greatWallSourceFixture);

  const result = await processNextPartialLocations({
    eventsReader,
    locationDirectory: new LocalLocationDirectory(),
    localLocationStore: new LocalLocalLocationStore(),
    recognizer: {
      async recognize() {
        return { kind: 'failed', reason: 'OpenRouter request failed with HTTP 503.' };
      },
    },
  });

  expect(result).toMatchObject({ acknowledged: 0, failed: 1, processed: 1 });
});
```

- [ ] **Step 2: Run the failing worker test**

Run: `npm test -- --runTestsByPath src/services/location-worker/__tests__/location-worker-test.ts --runInBand`

Expected: FAIL because `recognitionJobStore` and retry-without-ack behavior are not implemented.

- [ ] **Step 3: Update worker types**

Modify `src/services/location-worker/location-worker.ts` imports:

```ts
import type {
  EventsReader,
  LocalLocationStore,
  LocationDirectory,
  LocationRecognizer,
  QueuedPartialLocation,
  RecognitionJobStore,
} from '@/services/contracts';
```

Modify `LocationWorkerDeps`:

```ts
export type LocationWorkerDeps = {
  eventsReader: EventsReader;
  locationDirectory: LocationDirectory;
  localLocationStore: LocalLocationStore;
  recognizer: LocationRecognizer;
  recognitionJobStore?: RecognitionJobStore;
};
```

Add:

```ts
export type QueuedLocationWorkerResult =
  | { outcome: 'matched'; locationId: string }
  | { outcome: 'needsReview'; reason: string }
  | { outcome: 'retry'; reason: string };
```

- [ ] **Step 4: Extract single-message processing**

Replace the current private `processMessage` body with an exported helper:

```ts
export async function processQueuedPartialLocation(
  deps: Omit<LocationWorkerDeps, 'eventsReader'>,
  message: QueuedPartialLocation
): Promise<QueuedLocationWorkerResult> {
  const recognized = await deps.recognizer.recognize(message.event);
  const localLocation = await deps.localLocationStore.findByPartialLocation(message.event);

  if (recognized.kind === 'recognized') {
    const location = await deps.locationDirectory.upsertLocation(recognized.location, {
      partialLocation: message.event,
    });
    if (localLocation) {
      await deps.localLocationStore.linkCanonicalLocation(localLocation.id, location.id);
    }
    await deps.recognitionJobStore?.markMatched(message.event.id, {
      location,
      recognizedLocation: recognized.location,
    });
    return { locationId: location.id, outcome: 'matched' };
  }

  if (recognized.kind === 'needsReview') {
    if (localLocation) {
      await deps.localLocationStore.updateStatus(localLocation.id, 'needsReview');
    }
    await deps.recognitionJobStore?.markNeedsReview(message.event.id, {
      reason: recognized.reason,
      recognizedLocation: recognized.location,
    });
    return { outcome: 'needsReview', reason: recognized.reason };
  }

  return { outcome: 'retry', reason: recognized.reason };
}
```

Then make `processMessage` call this helper and only ack `matched` or `needsReview`:

```ts
async function processMessage(
  deps: LocationWorkerDeps,
  message: QueuedPartialLocation,
  result: LocationWorkerResult
) {
  result.processed += 1;
  const messageResult = await processQueuedPartialLocation(deps, message);

  if (messageResult.outcome === 'matched') {
    await deps.eventsReader.ack(message.messageId);
    result.acknowledged += 1;
    result.matched += 1;
    return;
  }

  if (messageResult.outcome === 'needsReview') {
    await deps.eventsReader.ack(message.messageId);
    result.acknowledged += 1;
    result.failed += 1;
    return;
  }

  result.failed += 1;
}
```

- [ ] **Step 5: Run the focused test**

Run: `npm test -- --runTestsByPath src/services/location-worker/__tests__/location-worker-test.ts --runInBand`

Expected: PASS.

- [ ] **Step 6: Run typecheck**

Run: `npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/services/location-worker/location-worker.ts src/services/location-worker/__tests__/location-worker-test.ts
git commit -m "feat: update worker job status"
```

---

### Task 4: Lambda SQS Event Handler

**Files:**
- Create: `src/services/location-worker/lambda-handler.ts`
- Test: `src/services/location-worker/__tests__/lambda-handler-test.ts`

**Interfaces:**
- Consumes: `processQueuedPartialLocation(deps, message)`.
- Produces:
  - `createLocationRecognitionLambdaHandler(depsFactory)`
  - `locationRecognitionLambdaHandler(event)`
  - response shape `{ batchItemFailures: { itemIdentifier: string }[] }`

- [ ] **Step 1: Write the failing Lambda handler tests**

Create `src/services/location-worker/__tests__/lambda-handler-test.ts`:

```ts
import type { RecognizedLocation } from '@/services/contracts';

import { createLocationRecognitionLambdaHandler } from '../lambda-handler';

const sqsEvent = {
  Records: [
    {
      body: JSON.stringify({
        createdAt: '2026-06-22T12:00:00.000Z',
        id: 'partial-1',
        name: 'Great Wall of China',
      }),
      messageId: 'message-1',
    },
  ],
};

describe('location recognition lambda handler', () => {
  test('returns no batch failures when a record is processed', async () => {
    const handler = createLocationRecognitionLambdaHandler(async () => ({
      locationDirectory: {
        async getLocationsByIds() {
          return [];
        },
        async search() {
          return [];
        },
        async upsertLocation(input: RecognizedLocation) {
          return {
            allTrailsUrl: input.allTrailsUrl,
            createdAt: '2026-06-22T12:00:00.000Z',
            fieldConfidenceJson: JSON.stringify(input.fieldConfidence),
            googleMapsUrl: input.googleMapsUrl,
            id: 'location-1',
            instagramFeedUrl: input.instagramFeedUrl,
            latitude: input.latitude,
            longitude: input.longitude,
            name: input.name,
            updatedAt: '2026-06-22T12:00:00.000Z',
          };
        },
      },
      localLocationStore: {
        async findByPartialLocation() {
          return null;
        },
        async linkCanonicalLocation() {
          return undefined;
        },
        async updateStatus() {
          return undefined;
        },
        async upsertFromPartialLocation() {
          throw new Error('upsertFromPartialLocation should not be called by Lambda worker.');
        },
      },
      recognizer: {
        async recognize() {
          return {
            kind: 'recognized',
            location: {
              allTrailsUrl: null,
              fieldConfidence: { name: 0.99 },
              googleMapsUrl: null,
              instagramFeedUrl: null,
              latitude: null,
              longitude: null,
              name: 'Great Wall of China',
            },
          };
        },
      },
    }));

    await expect(handler(sqsEvent)).resolves.toEqual({ batchItemFailures: [] });
  });

  test('returns partial batch failure for retryable recognizer failure', async () => {
    const handler = createLocationRecognitionLambdaHandler(async () => ({
      locationDirectory: {
        async getLocationsByIds() {
          return [];
        },
        async search() {
          return [];
        },
        async upsertLocation() {
          throw new Error('upsertLocation should not be called for recognizer failure.');
        },
      },
      localLocationStore: {
        async findByPartialLocation() {
          return null;
        },
        async linkCanonicalLocation() {
          return undefined;
        },
        async updateStatus() {
          return undefined;
        },
        async upsertFromPartialLocation() {
          throw new Error('upsertFromPartialLocation should not be called by Lambda worker.');
        },
      },
      recognizer: {
        async recognize() {
          return { kind: 'failed', reason: 'OpenRouter returned invalid location JSON.' };
        },
      },
    }));

    await expect(handler(sqsEvent)).resolves.toEqual({
      batchItemFailures: [{ itemIdentifier: 'message-1' }],
    });
  });

  test('returns partial batch failure for malformed JSON', async () => {
    const handler = createLocationRecognitionLambdaHandler(async () => {
      throw new Error('deps should not be created for malformed JSON.');
    });

    await expect(
      handler({
        Records: [{ body: '{', messageId: 'message-1' }],
      })
    ).resolves.toEqual({
      batchItemFailures: [{ itemIdentifier: 'message-1' }],
    });
  });
});
```

- [ ] **Step 2: Run the failing Lambda handler test**

Run: `npm test -- --runTestsByPath src/services/location-worker/__tests__/lambda-handler-test.ts --runInBand`

Expected: FAIL because `lambda-handler.ts` does not exist.

- [ ] **Step 3: Implement the handler**

Create `src/services/location-worker/lambda-handler.ts`:

```ts
import type { LocationDirectory, LocationRecognizer, LocalLocationStore, PartialLocation, QueuedPartialLocation, RecognitionJobStore } from '@/services/contracts';

import { createAwsLocationRecognitionWorkerDeps } from './aws-worker-deps';
import { processQueuedPartialLocation } from './location-worker';

export type SqsLambdaEvent = {
  Records?: {
    body?: string;
    messageId?: string;
  }[];
};

export type SqsBatchResponse = {
  batchItemFailures: { itemIdentifier: string }[];
};

export type LambdaWorkerDeps = {
  locationDirectory: LocationDirectory;
  localLocationStore: LocalLocationStore;
  recognizer: LocationRecognizer;
  recognitionJobStore?: RecognitionJobStore;
};

export type LambdaWorkerDepsFactory = () => Promise<LambdaWorkerDeps>;

export function createLocationRecognitionLambdaHandler(
  createDeps: LambdaWorkerDepsFactory = createAwsLocationRecognitionWorkerDeps
) {
  return async function locationRecognitionLambdaHandler(event: SqsLambdaEvent): Promise<SqsBatchResponse> {
    const batchItemFailures: { itemIdentifier: string }[] = [];
    let deps: LambdaWorkerDeps | null = null;

    for (const record of event.Records ?? []) {
      const messageId = record.messageId ?? 'unknown-message';
      const parsed = parseRecord(record.body);
      if (!parsed) {
        batchItemFailures.push({ itemIdentifier: messageId });
        continue;
      }

      deps = deps ?? (await createDeps());
      const result = await processQueuedPartialLocation(deps, {
        event: parsed,
        messageId,
        receiveCount: 1,
        receivedAt: new Date().toISOString(),
      } satisfies QueuedPartialLocation);

      if (result.outcome === 'retry') {
        batchItemFailures.push({ itemIdentifier: messageId });
      }
    }

    return { batchItemFailures };
  };
}

export const locationRecognitionLambdaHandler = createLocationRecognitionLambdaHandler();

function parseRecord(body: string | undefined): PartialLocation | null {
  if (!body) {
    return null;
  }
  try {
    return JSON.parse(body) as PartialLocation;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run the focused test**

Run: `npm test -- --runTestsByPath src/services/location-worker/__tests__/lambda-handler-test.ts --runInBand`

Expected: PASS.

- [ ] **Step 5: Run typecheck**

Run: `npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/services/location-worker/lambda-handler.ts src/services/location-worker/__tests__/lambda-handler-test.ts
git commit -m "feat: add sqs lambda worker handler"
```

---

### Task 5: AWS Worker Dependency Assembly

**Files:**
- Create: `src/services/location-worker/aws-worker-deps.ts`
- Modify: `src/services/server/staging-location-services.ts`
- Test: `src/services/location-worker/__tests__/aws-worker-deps-test.ts`

**Interfaces:**
- Consumes: `createAwsStagingDatabaseFromEnv`, `ensureSqlLocationDirectorySchema`, `SqlLocationDirectory`, `SqlRecognitionJobStore`, and `createOpenRouterLocationRecognizer`.
- Produces: `createAwsLocationRecognitionWorkerDeps(env?: Record<string, string | undefined>): Promise<LambdaWorkerDeps>`.

- [ ] **Step 1: Write the failing dependency assembly test**

Create `src/services/location-worker/__tests__/aws-worker-deps-test.ts`:

```ts
import { loadOpenRouterConfigFromEnv } from '@/services/location-recognizers';

describe('AWS worker dependency config', () => {
  test('OpenRouter worker config requires API key and model', () => {
    expect(() => loadOpenRouterConfigFromEnv({})).toThrow('Missing OpenRouter env vars: OPENROUTER_API_KEY, OPENROUTER_MODEL');
    expect(
      loadOpenRouterConfigFromEnv({
        OPENROUTER_API_KEY: 'key',
        OPENROUTER_MODEL: 'google/gemini-2.5-flash',
      })
    ).toMatchObject({
      apiKey: 'key',
      model: 'google/gemini-2.5-flash',
    });
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npm test -- --runTestsByPath src/services/location-worker/__tests__/aws-worker-deps-test.ts --runInBand`

Expected: PASS if the existing OpenRouter config behavior is intact.

- [ ] **Step 3: Implement AWS dependency assembly**

Create `src/services/location-worker/aws-worker-deps.ts`:

```ts
import { createAwsStagingDatabaseFromEnv } from '@/services/aws/aws-aurora-data-api-database';
import { ensureSqlLocationDirectorySchema, SqlLocationDirectory, SqlRecognitionJobStore } from '@/services/db';
import { loadOpenRouterConfigFromEnv, createOpenRouterLocationRecognizer } from '@/services/location-recognizers';
import { InMemoryLocalLocationStore } from '@/services/server/in-memory-local-location-store';

import type { LambdaWorkerDeps } from './lambda-handler';

export async function createAwsLocationRecognitionWorkerDeps(
  env: Record<string, string | undefined> = readProcessEnv()
): Promise<LambdaWorkerDeps> {
  const database = await createAwsStagingDatabaseFromEnv(env);
  await ensureSqlLocationDirectorySchema(database);

  return {
    locationDirectory: new SqlLocationDirectory(database),
    localLocationStore: new InMemoryLocalLocationStore(),
    recognizer: createOpenRouterLocationRecognizer(loadOpenRouterConfigFromEnv(env)),
    recognitionJobStore: new SqlRecognitionJobStore(database),
  };
}

function readProcessEnv() {
  const globalWithProcess = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  };

  return globalWithProcess.process?.env ?? {};
}
```

- [ ] **Step 4: Wire staging API to create processing jobs**

Modify `src/services/server/staging-location-services.ts` so it creates one database and passes a recognition job store to intake:

```ts
import { AwsEventsWriter } from '@/services/aws/aws-events';
import { createAwsStagingDatabaseFromEnv } from '@/services/aws/aws-aurora-data-api-database';
import { ensureSqlLocationDirectorySchema, SqlLocationDirectory, SqlRecognitionJobStore } from '@/services/db';
import { createLocationIntakeService, type LocationIntakeService } from '@/services/location-intake';
```

Inside `createStagingLocationServices`:

```ts
  const database = await createAwsStagingDatabaseFromEnv(env);
  await ensureSqlLocationDirectorySchema(database);
  const eventsWriter = await AwsEventsWriter.fromEnv(env);
  const locationDirectory = new SqlLocationDirectory(database);
  const recognitionJobStore = new SqlRecognitionJobStore(database);
```

Then pass `recognitionJobStore`:

```ts
  const locationIntakeService = createLocationIntakeService({
    eventsWriter,
    locationDirectory,
    localLocationStore,
    recognitionJobStore,
  });
```

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm test -- --runTestsByPath src/services/location-worker/__tests__/aws-worker-deps-test.ts src/services/server/__tests__/location-api-handler-test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 6: Run typecheck**

Run: `npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/services/location-worker/aws-worker-deps.ts src/services/location-worker/__tests__/aws-worker-deps-test.ts src/services/server/staging-location-services.ts
git commit -m "feat: assemble aws recognition worker deps"
```

---

### Task 6: Real OpenRouter Worker Smoke Script

**Files:**
- Create: `scripts/location-worker-openrouter-smoke-test.ts`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `src/services/aws/README.md`

**Interfaces:**
- Consumes: `AwsEventsWriter`, `AwsEventsReader`, `createAwsLocationRecognitionWorkerDeps`, and `processNextPartialLocations`.
- Produces: `npm run worker:openrouter-smoke`.

- [ ] **Step 1: Create the smoke script**

Create `scripts/location-worker-openrouter-smoke-test.ts`:

```ts
import { AwsEventsReader, AwsEventsWriter } from '../src/services/aws/aws-events';
import type { PartialLocation } from '../src/services/contracts';
import { createAwsLocationRecognitionWorkerDeps } from '../src/services/location-worker/aws-worker-deps';
import { processNextPartialLocations } from '../src/services/location-worker';

async function main() {
  const env = readProcessEnv();
  const eventsWriter = await AwsEventsWriter.fromEnv(env);
  const eventsReader = await AwsEventsReader.fromEnv(env);
  const deps = await createAwsLocationRecognitionWorkerDeps(env);
  const partialLocation: PartialLocation = {
    createdAt: new Date().toISOString(),
    id: `partial-openrouter-smoke-${Date.now().toString(36)}`,
    name: 'Great Wall of China',
    textCaption: 'OpenRouter smoke test for Traveler location recognition.',
  };

  await deps.recognitionJobStore?.createProcessing(partialLocation);
  await eventsWriter.enqueuePartialLocation(partialLocation);

  const workerResult = await processNextPartialLocations(
    {
      eventsReader,
      locationDirectory: deps.locationDirectory,
      localLocationStore: deps.localLocationStore,
      recognizer: deps.recognizer,
      recognitionJobStore: deps.recognitionJobStore,
    },
    { limit: 5 }
  );

  if (workerResult.matched < 1) {
    throw new Error(`OpenRouter smoke worker did not match a location: ${JSON.stringify(workerResult)}`);
  }

  console.log(
    JSON.stringify(
      {
        partialLocationId: partialLocation.id,
        workerResult,
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
```

- [ ] **Step 2: Add the package script**

Modify `package.json` scripts:

```json
"worker:openrouter-smoke": "tsx scripts/location-worker-openrouter-smoke-test.ts"
```

- [ ] **Step 3: Document the smoke command**

Add `npm run worker:openrouter-smoke` to the staging command lists in `README.md` and `src/services/aws/README.md`, with this note:

```md
`worker:openrouter-smoke` uses the real OpenRouter recognizer and may incur model charges. Set `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` before running it.
```

- [ ] **Step 4: Run non-paid verification**

Run:

```bash
npm test -- --runTestsByPath src/services/location-worker/__tests__/lambda-handler-test.ts src/services/location-worker/__tests__/location-worker-test.ts src/services/db/__tests__/sql-recognition-job-store-test.ts --runInBand
```

Expected: PASS.

Run: `npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add scripts/location-worker-openrouter-smoke-test.ts package.json README.md src/services/aws/README.md
git commit -m "chore: add openrouter worker smoke test"
```

---

## Final Verification

- [ ] Run: `npm test -- --runInBand`
- [ ] Run: `npm run lint`
- [ ] Run: `npx tsc --noEmit`
- [ ] Run, only with paid model credentials intentionally configured: `npm run worker:openrouter-smoke`

Expected:

- Jest passes.
- Lint passes.
- TypeScript passes.
- The paid smoke test prints a `partialLocationId` and a worker result with at least one matched record.
