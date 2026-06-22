# SQS OpenRouter Worker Design

## Summary

Add the first deployable backend worker path for Traveler location recognition. The worker consumes `PartialLocation` messages from SQS, sends the recognition request to OpenRouter, parses the structured result, upserts canonical location metadata into Aurora, and acknowledges the SQS message only after successful persistence.

This step keeps the mobile app asynchronous. The app still calls the location API and receives immediate `processing` feedback; OpenRouter credentials and AWS credentials stay server-side.

## Requirements

- Use the existing service contracts and worker core where possible.
- Consume SQS messages from a Lambda-compatible handler.
- Use OpenRouter from server-side worker code only.
- Ask the model for strict JSON matching Traveler's canonical `RecognizedLocation` fields.
- Treat low-confidence model output as `needsReview`.
- Store recognized canonical location data in Aurora through the existing `LocationDirectory` adapter.
- Store a durable recognition job/result row in Aurora keyed by `partialLocation.id`.
- Acknowledge/delete SQS messages only after worker processing succeeds.
- Let transient OpenRouter, parsing, and Aurora failures retry through SQS visibility timeout and redrive policy.
- Keep SQS messages small; source images should be represented by durable blob URLs or IDs, not device-local `file://` URIs.
- Do not expose OpenRouter keys through `EXPO_PUBLIC_*` variables.

## Architecture

Create a Lambda-facing worker entrypoint that adapts AWS SQS event records into the existing worker contracts.

The handler will:

1. Build server-side dependencies from environment variables:
   - `AwsEventsReader` behavior adapted from the Lambda event records.
   - `AwsLocationDirectory` for Aurora search/upsert.
   - `createOpenRouterLocationRecognizer` for model recognition.
   - an Aurora-backed recognition job/result store.
2. Parse each SQS record body as `PartialLocation`.
3. Validate the event contains at least one recognition clue.
4. Call the existing recognition worker logic or a small shared `processQueuedPartialLocation` helper.
5. Upsert recognized canonical data into Aurora.
6. Update the Aurora recognition job row with `matched`, `needsReview`, or `failed`.
7. Return partial batch failures for records that should retry.

The existing `processNextPartialLocations` function remains useful for local and script-driven polling. The Lambda path should not manually poll SQS; AWS invokes the handler with SQS records.

## Prompt And Output

The prompt should be owned by the OpenRouter recognizer. It should provide:

- A short system instruction: identify travel places from partial evidence and return only JSON.
- The `PartialLocation` payload.
- Image references when available as durable URLs accessible to the model.
- The required JSON shape:
  - `name`
  - `googleMapsUrl`
  - `latitude`
  - `longitude`
  - `allTrailsUrl`
  - `instagramFeedUrl`
  - `confidence` per field

The parser accepts only valid JSON. If `confidence.name` is below `0.8`, the recognizer returns `needsReview` instead of `recognized`.

## Data Flow

1. The app submits a source through the location API.
2. The API persists any needed source photos to S3 before queueing, then enqueues a `PartialLocation`.
3. SQS triggers the Lambda worker.
4. The worker sends the `PartialLocation` to OpenRouter.
5. The worker parses and validates the model output.
6. The worker writes canonical location data and source Instagram reverse-lookup data to Aurora.
7. The worker records status for the original `partialLocation.id` in Aurora.
8. The worker reports success or partial batch failure to Lambda.

## Aurora Result Storage

Add a minimal Aurora-backed recognition job/result table:

- `partial_location_id`
- `status`: `processing | matched | needsReview | failed`
- `canonical_location_id`
- `failure_reason`
- `recognized_location_json`
- `created_at`
- `updated_at`

The API creates or updates the row as `processing` before enqueueing the SQS message. The worker updates the same row after recognition. This table is the durable handoff between the immediate API response and later worker completion.

## Error Handling

- Invalid message body: return it as a batch failure so it lands in the DLQ through normal redrive, because a malformed body may not contain a trustworthy `partialLocation.id`.
- OpenRouter HTTP/network failure: return a batch failure so SQS retries.
- Invalid model JSON: return a batch failure up to the queue redrive limit, then inspect via DLQ.
- Low confidence: persist a `needsReview` status and do not retry.
- Aurora failure: return a batch failure so SQS retries.
- Duplicate delivery: Aurora upsert and source-link writes must remain idempotent.

## Runtime Choice

Use Lambda with an SQS event source mapping for the first deployed worker. Expected jobs take about 20-30 seconds, which fits comfortably within Lambda limits. Configure:

- timeout: 60-90 seconds
- memory: 128 MB or 256 MB initially
- architecture: arm64 if compatible
- batch size: 1-5 to keep retries simple while the prompt and model behavior stabilize
- reserved concurrency: low initial cap to protect OpenRouter spend
- DLQ/redrive policy on the source queue

Do not use provisioned concurrency for the first slice.

## Testing

Add focused tests for:

- Lambda SQS event record parsing.
- Successful record processing writes Aurora through a fake `LocationDirectory`.
- Successful processing returns no batch failure for that record.
- OpenRouter failure returns a partial batch failure.
- Low-confidence output stores `needsReview` and does not retry.
- API enqueueing creates the initial `processing` recognition job row.
- Invalid JSON from OpenRouter is treated as retryable.
- Duplicate recognized output remains idempotent through the directory upsert contract.

Keep existing smoke tests:

- `npm run aws:sqs:smoke`
- `npm run worker:fixture-smoke`

Add a new smoke path for the real recognizer once `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` are configured.

## Follow-Ups

- Add S3 upload support for device file URIs before real image-only production traffic.
- Add CloudWatch alarms for DLQ depth and worker errors.
- Add model cost logging using OpenRouter usage metadata when available.
