# AWS Recognition Services

The app uses service contracts from `src/services/contracts`. AWS implementations are server-side only; do not import them into React Native screens or ship their credentials in Expo public config.

Implemented or planned mapping:

- `AwsEventsReader` / `AwsEventsWriter`: SQS queue consumer/producer.
- `AwsBlobStore`: S3 object storage for server-side blobs.
- `AwsAuroraDataApiDatabase`: generic Aurora PostgreSQL access through the RDS Data API.
- `SqlLocationDirectory`: domain helper that searches/upserts/hydrates canonical `Location` rows using a generic database client.
- `AwsLocationDirectory`: staging convenience wrapper around `SqlLocationDirectory` and `AwsAuroraDataApiDatabase`.

Do not put AWS secrets in Expo public environment variables. The mobile app should call an API; SQS, S3, RDB, and OpenRouter credentials belong on the backend/worker side.

## Staging Aurora Config

Set these server-side environment variables before running the smoke script:

- `AWS_REGION`
- `TRAVELER_AURORA_RESOURCE_ARN`
- `TRAVELER_AURORA_SECRET_ARN`
- `TRAVELER_AURORA_DATABASE=traveler_staging`

Then run:

```bash
npm run aws:aurora:smoke
```

The smoke script creates the minimal `locations` and `location_instagram_links` tables if needed, upserts `Aurora Smoke Test Location`, searches it by name, and prints the matched location.

Aurora canonical metadata lives in `locations`. Exact Instagram post/reel/source-link matching lives in `location_instagram_links`, keyed by canonicalized Instagram URL. The app reads saved rows from local SQLite and refreshes cached canonical metadata through the API; it does not call Aurora directly.

## Staging SQS Config

Set:

- `AWS_REGION`
- `LOCATION_RECOGNITION_QUEUE_URL`
- `LOCATION_RECOGNITION_DLQ_URL`

Then run:

```bash
npm run aws:sqs:smoke
```

The smoke script sends one `PartialLocation`, receives it through `AwsEventsReader`, acknowledges it, and prints the message id.

## Staging S3 Config

Set:

- `AWS_REGION`
- `LOCATION_BLOB_BUCKET`

Then run:

```bash
npm run aws:s3:smoke
```

The smoke script uploads a tiny private source-photo object, fetches a signed URL, and deletes the object. The current staging bucket discovered in AWS is `traveler-staging-195198314852-us-east-1-an`.

## Staging API And Worker Smokes

With Aurora and SQS configured, run:

```bash
npm run api:smoke
npm run worker:fixture-smoke
npm run worker:openrouter-smoke
```

`api:smoke` calls the staging HTTP handler in-process and verifies unmatched sources are enqueued. `worker:fixture-smoke` writes a Great Wall fixture event to SQS, consumes it, recognizes it with the deterministic fixture recognizer, upserts Aurora, and acknowledges the message.
`worker:openrouter-smoke` uses the real OpenRouter recognizer and may incur model charges. Set `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` before running it.

## OpenRouter Config

The real recognizer skeleton is implemented in `src/services/location-recognizers/openrouter-location-recognizer.ts`. It is intentionally not required for the fixture worker smoke path.

Set these only when you are ready to test paid vision calls:

- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `OPENROUTER_BASE_URL` (optional)
- `OPENROUTER_SITE_URL` (optional)
- `OPENROUTER_APP_TITLE` (optional)
