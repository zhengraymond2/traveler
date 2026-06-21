# LLM Image Recognition Local-First Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Before editing Expo app code, read the exact SDK docs at `https://docs.expo.dev/versions/v56.0.0/`.

**Goal:** Build the location-recognition intake flow behind testable service interfaces, starting with local services and a fake recognizer, then leaving clear AWS adapter boundaries for SQS, blob storage, RDB/API, and worker processing.

**Architecture:** The app talks to service contracts in `src/services` and an HTTP backend API client. Local proof services and test fixtures live outside app code under `test/`, while production-facing contracts and future AWS adapters live under `src/`. The first shipped slice uses local services, deterministic fake recognition, local private `LocalLocation` records, and cached canonical `Location` data; AWS implementations can later replace local services behind the same interfaces.

**Tech Stack:** Expo SDK 56, Expo Router, React Native, TypeScript, Jest, Drizzle/SQLite for app-local cache, Node local backend for development/tests, AWS SQS/S3/Aurora Data API staging adapters, Lambda-style worker boundary, future OpenRouter vision recognizer.

## Global Constraints

- Keep local proof and testing services outside `src`, under `test/`, unless the code is part of the app runtime contract or production adapter boundary.
- Keep app-relevant interfaces, dependency injection, HTTP clients, app services, and future AWS adapter stubs in `src`.
- The app must not talk directly to SQS, RDB, or blob storage from the device. App flows call an API client; tests may call service interfaces directly.
- Unit tests should use injected fakes/local implementations and must not depend on real `expo-sqlite`.
- Run focused tests after each slice before broadening the change set.
- User photos remain private source photos and are not promoted to canonical shared `Location` photos.
- Canonical `Location` data must not store private user notes, source photos, or private source provenance.
- `Recently added` is an additional saved-locations section. Items still appear in their normal saved/country sections during the first hour.
- Recognition is stubbed for the first implementation. The fake recognizer must return deterministic `Location` data for known image fixtures.
- Low-confidence and failed recognition workflows are intentionally deferred but must be represented by explicit implementation notes and status states.
- `Location.instagramFeedUrl` should prefer an Instagram geolocation page when available, with a hashtag/search-style URL as fallback.
- The `[id].tsx` detail page must show source Instagram/source links and user source photos first, then a public Instagram feed/link section based on canonical `Location.instagramFeedUrl`.

---

## Approved Design Decisions

- Use dependency injection as the core architecture.
- Use function/constructor injection for service logic and React Context injection for screens.
- Use a local-first backend facade:
  - App -> HTTP API client in `src`.
  - Development app -> local Node service under `test/`.
  - Unit tests -> service contracts directly with fakes/local implementations under `test/`.
  - Future production -> AWS-backed API/service implementations.
- Use local dedupe for repeated source additions. If a duplicate source/location is added, append any new source photos, links, captions, and private description instead of creating a second local record.
- Show unmatched records immediately as processing in both the success popup and saved locations.
- Keep all user-provided photos private in the local source section.
- Store canonical place data separately from local/private provenance.
- Replace the earlier public photo gallery idea with a canonical `instagramFeedUrl` rendered as an embedded/openable Instagram feed section.

## Target Domain Model

### PartialLocation

`PartialLocation` is the inbound event shape. It must contain at least one useful clue:

- `id`
- `name`
- `photoBlobIds`
- `sourcePhotoUris`
- `instagramUrls`
- `textCaption`
- `googleMapsUrl`
- `gpsCoordinates`
- `allTrailsUrl`
- `createdAt`

### LocalLocation

`LocalLocation` is private, user-owned app data:

- `id`
- `canonicalLocationId`
- `status`: `processing | matched | needsReview | failed`
- `sourcePhotoUris`
- `sourceLinks`
- `sourceInstagramUrls`
- `privateDescription`
- `lastPartialLocationId`
- `addedAt`
- `updatedAt`

### Canonical Location

`Location` is shared/canonical place data:

- `id`
- `name`
- `googleMapsUrl`
- `latitude`
- `longitude`
- `allTrailsUrl`
- `instagramFeedUrl`
- `fieldConfidenceJson`
- `createdAt`
- `updatedAt`

### Service Contracts

Create contracts in `src/services/contracts`:

- `EventsWriter.enqueuePartialLocation(event: PartialLocation): Promise<void>`
- `EventsReader.receivePartialLocations(limit: number): Promise<QueuedPartialLocation[]>`
- `EventsReader.ack(messageId: string): Promise<void>`
- `BlobStore.putSourcePhoto(input): Promise<BlobObjectRef>`
- `BlobStore.getObjectUrl(blobId: string): Promise<string>`
- `LocationDirectory.search(input: PartialLocation): Promise<LocationSearchResult[]>`
- `LocationDirectory.upsertLocation(input: RecognizedLocation): Promise<Location>`
- `LocalLocationStore.upsertFromPartialLocation(input): Promise<LocalLocation>`
- `LocalLocationStore.linkCanonicalLocation(localLocationId, locationId): Promise<void>`
- `LocationRecognizer.recognize(input: PartialLocation): Promise<RecognizedLocationResult>`
- `LocationIntakeService.addSource(input: AddSourceInput): Promise<AddSourceResult>`

## File Structure Plan

- Create `src/services/contracts/location-types.ts` for shared TypeScript domain types.
- Create `src/services/contracts/events.ts` for event queue contracts.
- Create `src/services/contracts/blob-store.ts` for object/blob storage contracts.
- Create `src/services/contracts/location-directory.ts` for canonical location lookup/upsert contracts.
- Create `src/services/contracts/local-location-store.ts` for local private saved-location contracts.
- Create `src/services/contracts/location-recognizer.ts` for fake and future real recognizer contracts.
- Create `src/services/location-intake/location-intake-service.ts` for add-source orchestration.
- Create `src/services/app-services.tsx` for `ServicesProvider`, `useServices`, and default app service assembly.
- Create `src/services/api/location-api-client.ts` for the app-facing HTTP API client.
- Create `src/services/aws/*` stubs for future AWS-backed implementations.
- Create `test/local-services/*` for local events, blob store, canonical directory, fake recognizer, and local backend helpers.
- Create `test/fixtures/location-recognition/*` for deterministic image recognition fixtures.
- Modify `src/db/schema/*`, `src/db/repository.ts`, and migrations to support `LocalLocation`, source photos/links, cached canonical `Location`, and `instagramFeedUrl`.
- Modify `src/app/add-source.tsx`, future `src/app/handle-share.tsx`, `src/app/(tabs)/saved.tsx`, `src/app/saved/[country].tsx`, and `src/app/saved/location/[id].tsx` to use the new intake flow and UI states.

---

### Task 1: Service Contract Types

**Files:**
- Create: `src/services/contracts/location-types.ts`
- Create: `src/services/contracts/events.ts`
- Create: `src/services/contracts/blob-store.ts`
- Create: `src/services/contracts/location-directory.ts`
- Create: `src/services/contracts/local-location-store.ts`
- Create: `src/services/contracts/location-recognizer.ts`
- Create: `src/services/contracts/index.ts`
- Test: `src/services/contracts/__tests__/location-types-test.ts`

**Interfaces:**
- Produces all shared type names consumed by later tasks: `PartialLocation`, `LocalLocation`, `Location`, `RecognitionConfidence`, `RecognizedLocation`, `QueuedPartialLocation`, `EventsReader`, `EventsWriter`, `BlobStore`, `LocationDirectory`, `LocalLocationStore`, and `LocationRecognizer`.

- [ ] Write focused type/normalization tests in `src/services/contracts/__tests__/location-types-test.ts` for:
  - A `PartialLocation` with only `sourcePhotoUris` is valid.
  - A `PartialLocation` with no clues is rejected by `assertValidPartialLocation`.
  - `instagramFeedUrl` is part of canonical `Location`.
  - `sourcePhotoUris` belongs to `LocalLocation`, not canonical `Location`.
- [ ] Run `npm test -- --runTestsByPath src/services/contracts/__tests__/location-types-test.ts --runInBand`.
- [ ] Implement the contract files with explicit exported types and `assertValidPartialLocation(input: PartialLocation): void`.
- [ ] Rerun the focused test until it passes.
- [ ] Run `npx tsc --noEmit`.
- [ ] Commit: `feat: add location recognition service contracts`.

### Task 2: Local Test Services

**Files:**
- Create: `test/local-services/local-events.ts`
- Create: `test/local-services/local-blob-store.ts`
- Create: `test/local-services/local-location-directory.ts`
- Create: `test/local-services/local-local-location-store.ts`
- Create: `test/local-services/fake-location-recognizer.ts`
- Create: `test/fixtures/location-recognition/great-wall-source.ts`
- Test: `test/local-services/__tests__/local-services-test.ts`

**Interfaces:**
- Consumes contracts from Task 1.
- Produces local implementations usable by unit and integration tests without Expo SQLite.

- [ ] Write failing tests proving:
  - `LocalEventsWriter.enqueuePartialLocation` stores serialized JSON events.
  - `LocalEventsReader.receivePartialLocations(1)` returns one queued message.
  - `ack(messageId)` prevents the same message from being returned again.
  - `FakeLocationRecognizer` maps the Great Wall image fixture to `name: "Great Wall of China"` and an Instagram geolocation URL.
  - `LocalLocationDirectory.upsertLocation` dedupes canonical locations by normalized name and coordinates when available.
- [ ] Run `npm test -- --runTestsByPath test/local-services/__tests__/local-services-test.ts --runInBand`.
- [ ] Implement each local service as a small in-memory class with optional constructor seed data.
- [ ] Rerun the focused test until it passes.
- [ ] Run `npx tsc --noEmit`.
- [ ] Commit: `test: add local recognition service fakes`.

### Task 3: Location Intake Orchestration

**Files:**
- Create: `src/services/location-intake/location-intake-service.ts`
- Create: `src/services/location-intake/index.ts`
- Test: `src/services/location-intake/__tests__/location-intake-service-test.ts`

**Interfaces:**
- Consumes `EventsWriter`, `BlobStore`, `LocationDirectory`, and `LocalLocationStore`.
- Produces `createLocationIntakeService(deps).addSource(input): Promise<AddSourceResult>`.

- [ ] Write failing tests for:
  - Existing canonical match creates or updates a local record, links `canonicalLocationId`, and emits no event.
  - Unmatched source creates a local record with `status: "processing"` and emits one `PartialLocation`.
  - Duplicate local source appends new source photos and links instead of creating a new local record.
  - A source containing only an image fixture is accepted.
- [ ] Run `npm test -- --runTestsByPath src/services/location-intake/__tests__/location-intake-service-test.ts --runInBand`.
- [ ] Implement `createLocationIntakeService` using only injected dependencies.
- [ ] Add implementation notes for deferred low-confidence and recognizer-failure policy:
  - `needsReview` for low-confidence recognition.
  - `failed` for unrecoverable processing failures.
  - No user-facing retry UX in the first slice.
- [ ] Rerun the focused test until it passes.
- [ ] Run `npx tsc --noEmit`.
- [ ] Commit: `feat: add local-first location intake service`.

### Task 4: Local Worker Processing

**Files:**
- Create: `src/services/location-worker/location-worker.ts`
- Create: `src/services/location-worker/index.ts`
- Test: `src/services/location-worker/__tests__/location-worker-test.ts`

**Interfaces:**
- Consumes `EventsReader`, `LocationRecognizer`, `LocationDirectory`, and `LocalLocationStore`.
- Produces `processNextPartialLocations(deps, options): Promise<LocationWorkerResult>`.

- [ ] Write failing tests for:
  - Worker consumes an image-only queued `PartialLocation`.
  - Fake recognizer returns Great Wall canonical data.
  - Worker writes/upserts canonical `Location`.
  - Worker links the matching `LocalLocation` and changes its status from `processing` to `matched`.
  - Worker acknowledges the message after successful processing.
- [ ] Run `npm test -- --runTestsByPath src/services/location-worker/__tests__/location-worker-test.ts --runInBand`.
- [ ] Implement a batch worker that processes a small configurable limit, defaulting to 5 events.
- [ ] Leave explicit implementation notes for:
  - Dead-letter behavior.
  - Retry backoff.
  - OpenAI vision errors.
  - Confidence score threshold policy below `0.8`.
- [ ] Rerun the focused test until it passes.
- [ ] Run `npx tsc --noEmit`.
- [ ] Commit: `feat: add local location recognition worker`.

### Task 5: App Local Cache Schema

**Files:**
- Modify: `src/db/schema/locations.ts`
- Create: `src/db/schema/local-locations.ts`
- Create: `src/db/schema/local-location-source-photos.ts`
- Create: `src/db/schema/local-location-source-links.ts`
- Modify: `src/db/schema/relations.ts`
- Modify: `src/db/schema/index.ts`
- Modify: `src/db/repository.ts`
- Modify: `src/db/README.md`
- Create migration: `drizzle/0002_location_recognition_cache.sql`
- Test: `src/db/__tests__/location-recognition-cache-test.ts`

**Interfaces:**
- Consumes domain model from Tasks 1-4.
- Produces local repository methods for private `LocalLocation` records and cached canonical `Location` records.

- [ ] Write failing repository tests for:
  - Creating a private `LocalLocation` with source photos and source Instagram links.
  - Updating an existing local record when a duplicate source is added.
  - Storing canonical `Location.instagramFeedUrl`.
  - Keeping source photos out of canonical `Location`.
  - Querying `Recently added` records from the last hour sorted newest first.
- [ ] Run `npm test -- --runTestsByPath src/db/__tests__/location-recognition-cache-test.ts --runInBand`.
- [ ] Update Drizzle schema and repository in small increments.
- [ ] Generate or hand-author the migration consistent with existing migration style.
- [ ] Update `src/db/README.md` diagrams and table notes.
- [ ] Rerun the focused DB test until it passes.
- [ ] Run `npm run db:generate` if schema snapshots must change.
- [ ] Run `npx tsc --noEmit`.
- [ ] Commit: `feat: add local location cache schema`.

### Task 6: App Services Provider And HTTP Client Boundary

**Files:**
- Create: `src/services/app-services.tsx`
- Create: `src/services/api/location-api-client.ts`
- Create: `src/services/aws/aws-events.ts`
- Create: `src/services/aws/aws-blob-store.ts`
- Create: `src/services/aws/aws-location-directory.ts`
- Create: `src/services/aws/README.md`
- Modify: `src/app/_layout.tsx`
- Test: `src/services/__tests__/app-services-test.tsx`

**Interfaces:**
- Consumes contracts from Task 1.
- Produces `ServicesProvider`, `useServices`, `createAppServices`, and API-client shapes that can later point to AWS-backed endpoints.

- [ ] Write failing tests that:
  - `useServices` returns injected fake services inside `ServicesProvider`.
  - `useServices` throws a helpful error outside the provider.
  - `LocationApiClient` serializes `PartialLocation` payloads without importing local test services.
- [ ] Run `npm test -- --runTestsByPath src/services/__tests__/app-services-test.tsx --runInBand`.
- [ ] Implement `ServicesProvider` and `useServices`.
- [ ] Add minimal AWS adapter stubs that throw clear "not configured" errors and document expected future environment variables.
- [ ] Wire `ServicesProvider` into `src/app/_layout.tsx`.
- [ ] Rerun the focused test until it passes.
- [ ] Run `npx tsc --noEmit`.
- [ ] Commit: `feat: add app service injection boundary`.

### Task 7: Add Source Flow

**Files:**
- Modify: `src/app/add-source.tsx`
- Modify: `src/features/locations/add-source-helpers.ts`
- Test: `src/app/__tests__/add-source-recognition-test.tsx`
- Test: `src/features/locations/__tests__/add-source-helpers-test.ts`

**Interfaces:**
- Consumes `useServices().locationIntakeService`.
- Produces add-source behavior that creates immediate local records and shows success/processing feedback.

- [ ] Write failing tests for:
  - Matched source shows immediate success results and emits no event.
  - Unmatched image-only source shows "processing" feedback and emits one event.
  - Duplicate source appends photos/links to the existing local record.
  - User-provided source photos stay in the source section data.
- [ ] Run focused tests:
  - `npm test -- --runTestsByPath src/features/locations/__tests__/add-source-helpers-test.ts --runInBand`
  - `npm test -- --runTestsByPath src/app/__tests__/add-source-recognition-test.tsx --runInBand`
- [ ] Refactor submit handling to build `PartialLocation`/`AddSourceInput`.
- [ ] Replace direct `writer.createLocation` calls with `locationIntakeService.addSource`.
- [ ] Add the success popup/feedback surface showing matched and processing rows.
- [ ] Rerun focused tests until they pass.
- [ ] Run `npx tsc --noEmit`.
- [ ] Commit: `feat: route add source through recognition intake`.

### Task 8: Share Intake And Bulk Image Intake

**Files:**
- Finish or create: `src/app/handle-share.tsx`
- Modify: `src/features/share/share-intake.ts`
- Create: `src/features/locations/bulk-image-intake.ts`
- Test: `src/features/share/__tests__/share-intake-test.ts`
- Test: `src/features/locations/__tests__/bulk-image-intake-test.ts`

**Interfaces:**
- Consumes `locationIntakeService.addSource`.
- Produces shared/bulk payload conversion to `PartialLocation` inputs.

- [ ] Write failing tests that:
  - Instagram shared URLs become source links and canonical clues.
  - Google Maps shared URLs become canonical clues.
  - Image shares become source photos and image-only `PartialLocation` clues.
  - Bulk image intake emits one add-source request per image and shows processing counts.
- [ ] Run focused tests for share and bulk helpers.
- [ ] Complete `handle-share.tsx` if not already present, using Expo SDK 56 share APIs.
- [ ] Route share and bulk-image flows through `locationIntakeService.addSource`.
- [ ] Rerun focused tests until they pass.
- [ ] Run `npx tsc --noEmit`.
- [ ] Commit: `feat: route share and bulk images through intake`.

### Task 9: Saved Locations Recently Added UI

**Files:**
- Modify: `src/app/(tabs)/saved.tsx`
- Modify: `src/app/saved/[country].tsx`
- Modify: `src/features/locations/saved-country-rows.ts`
- Create: `src/features/locations/recently-added.ts`
- Test: `src/features/locations/__tests__/recently-added-test.ts`
- Test: `src/app/(tabs)/__tests__/saved-recently-added-test.tsx`

**Interfaces:**
- Consumes repository methods from Task 5.
- Produces recently-added grouping and processing status display.

- [ ] Write failing tests for:
  - Records added in the last hour appear in `Recently added`.
  - Recently added records are sorted newest first.
  - Processing records show a processing label.
  - Recently added records also remain visible in their normal country section.
- [ ] Run focused tests for the recently-added helper and saved screen.
- [ ] Implement `getRecentlyAddedLocations(now, locations)`.
- [ ] Add the `Recently added` section at the top of saved locations.
- [ ] Add processing labels to saved/country rows where `LocalLocation.status === "processing"`.
- [ ] Rerun focused tests until they pass.
- [ ] Run `npx tsc --noEmit`.
- [ ] Commit: `feat: show recently added processing locations`.

### Task 10: Location Detail Source And Public Feed UI

**Files:**
- Modify: `src/app/saved/location/[id].tsx`
- Create: `src/components/instagram-feed-panel.tsx`
- Test: `src/app/__tests__/saved-location-detail-recognition-test.tsx`
- Test: `src/components/__tests__/instagram-feed-panel-test.tsx`

**Interfaces:**
- Consumes `LocalLocation` with source photos/links and cached canonical `Location`.
- Produces detail UI with source section first and public Instagram feed/link section second.

- [ ] Write failing tests that:
  - Source Instagram links render above source photos.
  - User source photos render in the source section.
  - Private notes render only from local/private data.
  - Canonical `instagramFeedUrl` renders in the public section.
  - When a WebView is unavailable or blocked, the UI still offers an openable Instagram link.
- [ ] Run focused tests for detail route and feed panel.
- [ ] Implement `InstagramFeedPanel` with a WebView-ready boundary or openable-link fallback, following Expo SDK 56 docs before adding any dependency.
- [ ] Refactor `[id].tsx` to load local/private data plus cached canonical data.
- [ ] Remove any public canonical photo gallery behavior from the detail view.
- [ ] Rerun focused tests until they pass.
- [ ] Run `npx tsc --noEmit`.
- [ ] Commit: `feat: show source photos and instagram feed on details`.

### Task 11: End-To-End Test Scenarios With Local Services

**Files:**
- Create: `test/e2e/location-recognition-existing-source-test.ts`
- Create: `test/e2e/location-recognition-new-source-test.ts`
- Create: `test/e2e/location-recognition-image-only-worker-test.ts`
- Create: `test/e2e/location-recognition-test-harness.ts`

**Interfaces:**
- Consumes all completed local services and app-facing service contracts.
- Produces repeatable local e2e-style tests without AWS credentials.

- [ ] Write e2e-style test A:
  - Seed canonical DB with an existing location.
  - Add a source matching that location.
  - Assert no event is emitted.
  - Assert success feedback is immediate.
  - Assert local cached canonical data is visible.
  - Assert source photos and source links are retained locally.
- [ ] Write e2e-style test B:
  - Add an unmatched source.
  - Assert an event is emitted.
  - Assert processing feedback is shown.
  - Assert `LocalLocation` exists immediately.
  - Assert cached canonical `Location` does not exist yet.
  - Run fake worker or manually upsert fake RDB data.
  - Simulate app refresh.
  - Assert cached canonical data is visible.
  - Assert `[id].tsx` shows source data and canonical data.
- [ ] Write e2e-style test C:
  - Add image-only `PartialLocation` using the Great Wall fixture.
  - Run local worker.
  - Assert fake recognizer fills the Great Wall canonical location and `instagramFeedUrl`.
  - Assert local record transitions from `processing` to `matched`.
- [ ] Run each e2e-style test individually.
- [ ] Run `npm test -- --runInBand`.
- [ ] Run `npm run lint`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Commit: `test: cover local recognition intake flow`.

### Task 12: AWS Adapter Planning Notes

**Files:**
- Modify: `src/services/aws/README.md`
- Create: `docs/location-recognition-aws-rollout.md`

**Interfaces:**
- Consumes contracts and local proof results.
- Produces implementation notes for replacing local services with AWS-backed services.

- [x] Document AWS mapping:
  - `EventsReader/Writer` -> SQS.
  - `BlobStore` -> S3.
  - `LocationDirectory` -> API backed by RDS/Aurora.
  - Worker -> Lambda or container worker consuming SQS.
  - Recognizer -> OpenRouter vision call behind server-side worker.
- [x] Document required secrets and config names without committing values.
- [x] Document local-to-AWS cutover tests.
- [x] Run `npx tsc --noEmit` to ensure docs-only changes did not hide stale type errors from prior tasks.
- [ ] Commit: `docs: plan aws recognition rollout`.

## Prompt Template For Future Real Recognizer

The first implementation uses a fake recognizer. When the real recognizer is added, the worker should use a structured prompt that requests strict JSON matching `RecognizedLocation`.

### If Name Is Provided

```text
You are helping identify and normalize travel locations for a saved-places app.

Known location name: {partialLocation.name}
Partial information:
{partialLocationJson}

Fill the missing fields for this canonical Location schema:
{
  "name": "string",
  "googleMapsUrl": "string | null",
  "latitude": "number | null",
  "longitude": "number | null",
  "allTrailsUrl": "string | null",
  "instagramFeedUrl": "string | null",
  "fieldConfidence": {
    "name": "number",
    "googleMapsUrl": "number",
    "gpsCoordinates": "number",
    "allTrailsUrl": "number",
    "instagramFeedUrl": "number"
  }
}

Prefer an official or highly specific Instagram geolocation page for instagramFeedUrl.
If no geolocation page is likely, provide the best hashtag/explore URL fallback.
Each confidence score must be a float from 0.0 to 1.0.
Scores over 0.8 mean you are very certain.
Scores under 0.8 mean the app should ask the user to verify.
Return only strict JSON.
```

### If Name Is Missing

```text
You are helping identify a travel location from partial user-provided clues.

Partial information:
{partialLocationJson}

Use the images, GPS coordinates, Instagram caption, Instagram URL, Google Maps URL, AllTrails URL, and text caption to identify the location name and fill this canonical Location schema:
{
  "name": "string | null",
  "googleMapsUrl": "string | null",
  "latitude": "number | null",
  "longitude": "number | null",
  "allTrailsUrl": "string | null",
  "instagramFeedUrl": "string | null",
  "fieldConfidence": {
    "name": "number",
    "googleMapsUrl": "number",
    "gpsCoordinates": "number",
    "allTrailsUrl": "number",
    "instagramFeedUrl": "number"
  }
}

Most importantly, identify the NAME of the location.
Prefer an official or highly specific Instagram geolocation page for instagramFeedUrl.
If no geolocation page is likely, provide the best hashtag/explore URL fallback.
Each confidence score must be a float from 0.0 to 1.0.
Scores over 0.8 mean you are very certain.
Scores under 0.8 mean the model suspects the location but there are no defining features that guarantee it, so the app should ask the user to manually input or verify the guess.
Return only strict JSON.
```

## Implementation Notes Log

Add dated notes here during implementation when the design changes or an implementation decision needs to be preserved.

- 2026-06-21: Initial plan approved as local-first. App uses dependency-injected service contracts and an HTTP API boundary. Local proof/test implementations live under `test/`; production interfaces and future AWS stubs live under `src/`.
- 2026-06-21: Added AWS staging plumbing for Aurora Data API, SQS events, S3 source-photo blobs, an in-process staging API handler, and a fixture worker smoke runner. The worker smoke path still uses the deterministic fixture recognizer so the full SQS -> worker -> Aurora route can be tested before enabling paid vision calls.
- 2026-06-21: Added an OpenRouter recognizer skeleton behind `LocationRecognizer`. It expects `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`, sends multimodal chat completions, requests JSON output, and returns `needsReview` for name confidence below `0.8`.
- 2026-06-21: The staging S3 bucket discovered from AWS is `traveler-staging-195198314852-us-east-1-an`; `.env` should use that full bucket name for `LOCATION_BLOB_BUCKET`.
