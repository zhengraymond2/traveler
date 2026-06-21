# Location Recognition AWS Rollout

This branch implements the location recognition flow behind contracts and local fakes first. AWS should replace local service internals without changing app screens or service orchestration.

## Service Mapping

| Contract | Local proof | AWS rollout |
| --- | --- | --- |
| `EventsWriter` | `LocalEventsWriter` | API writes `PartialLocation` JSON to SQS. |
| `EventsReader` | `LocalEventsReader` | Lambda/container worker polls SQS and acks by deleting messages. |
| `BlobStore` | `LocalBlobStore` | Server stores uploaded source blobs in S3. |
| `DatabaseClient` | Test fakes | `AwsAuroraDataApiDatabase` using Aurora PostgreSQL RDS Data API. |
| `LocationDirectory` | `LocalLocationDirectory` | `SqlLocationDirectory` backed by `DatabaseClient` for canonical `Location` search/upsert. |
| `LocationRecognizer` | `FakeLocationRecognizer` | Worker calls OpenRouter vision with the prompt from `Plan.MD`. |
| Worker | `processNextPartialLocations` | Lambda or long-running container consuming SQS in small batches. |

## Config Names

Use server-side environment variables for secrets and resource identifiers:

- `AWS_REGION`
- `LOCATION_RECOGNITION_QUEUE_URL`
- `LOCATION_RECOGNITION_DLQ_URL`
- `LOCATION_BLOB_BUCKET`
- `TRAVELER_AURORA_RESOURCE_ARN`
- `TRAVELER_AURORA_SECRET_ARN`
- `TRAVELER_AURORA_DATABASE=traveler_staging`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `OPENROUTER_BASE_URL` (optional, defaults to `https://openrouter.ai/api/v1`)
- `OPENROUTER_SITE_URL` (optional)
- `OPENROUTER_APP_TITLE` (optional)

Use client-side Expo public config only for non-secret API routing:

- `EXPO_PUBLIC_LOCATION_API_URL`

Do not put AWS credentials, database passwords, or OpenRouter keys in `EXPO_PUBLIC_*` variables.

## Cutover Tests

Before switching the app from local proof services to AWS-backed services:

1. Send an image-only `PartialLocation` to SQS and verify the worker receives exactly one message.
2. Verify successful worker processing deletes the SQS message.
3. Verify failed recognition routes to retry/dead-letter behavior instead of disappearing silently.
4. Upload a source image through the API and verify the stored S3 object is private by default.
5. Search the RDB-backed `LocationDirectory` by name, Google Maps URL, and GPS coordinates.
6. Upsert the same recognized location twice and verify canonical dedupe.
7. Run the local e2e-style tests and the AWS integration smoke test with the same contract-level expectations.

## Aurora Staging Smoke Test

Once an Aurora PostgreSQL cluster has the RDS Data API enabled and a Secrets Manager secret is available, export:

```bash
export AWS_REGION=us-east-1
export TRAVELER_AURORA_RESOURCE_ARN='arn:aws:rds:...:cluster:traveler-staging'
export TRAVELER_AURORA_SECRET_ARN='arn:aws:secretsmanager:...:secret:traveler-staging'
export TRAVELER_AURORA_DATABASE=traveler_staging
```

Then run:

```bash
npm run aws:aurora:smoke
```

The command creates the minimal `locations` table, writes `Aurora Smoke Test Location`, reads it back through `SqlLocationDirectory`, and prints the matched count.

If the logical database does not exist yet, create it once through the Data API using the default `postgres` database:

```bash
aws rds-data execute-statement \
  --profile traveler-staging \
  --resource-arn "$TRAVELER_AURORA_RESOURCE_ARN" \
  --secret-arn "$TRAVELER_AURORA_SECRET_ARN" \
  --database postgres \
  --sql "create database traveler_staging"
```

## Staging Smoke Commands

After `.env` contains the staging values, run these from the repo root:

```bash
npm run aws:aurora:smoke
npm run aws:sqs:smoke
npm run aws:s3:smoke
npm run api:smoke
npm run worker:fixture-smoke
```

The current discovered staging S3 bucket is `traveler-staging-195198314852-us-east-1-an`. If `.env` still has the shorter display name `traveler-staging`, update `LOCATION_BLOB_BUCKET` before running the S3 smoke test.

The fixture worker smoke test still uses `FixtureLocationRecognizer`; it proves the SQS -> worker -> Aurora write path without sending images to a paid vision model.

## OpenRouter Recognizer Skeleton

`createOpenRouterLocationRecognizer` is implemented behind the same `LocationRecognizer` contract, but it is not wired into staging by default. To test it later, set:

```bash
export OPENROUTER_API_KEY=...
export OPENROUTER_MODEL=...
```

The recognizer posts to OpenRouter's chat completions endpoint, includes image URIs as multimodal content, requests JSON output, and returns `needsReview` when the name confidence is below `0.8`.

## Deferred Product Decisions

- Define the user-facing workflow for `needsReview` when confidence is below `0.8`.
- Define retry/backoff limits and dead-letter alerting.
- Decide whether Instagram public feed pages should open externally only or render in an in-app WebView where allowed.
