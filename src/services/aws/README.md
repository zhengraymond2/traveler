# AWS Recognition Services

The app uses service contracts from `src/services/contracts`. AWS implementations are server-side only; do not import them into React Native screens or ship their credentials in Expo public config.

Implemented or planned mapping:

- `AwsEventsReader` / `AwsEventsWriter`: SQS queue consumer/producer.
- `AwsBlobStore`: S3 object storage for server-side blobs.
- `AwsAuroraDataApiDatabase`: generic Aurora PostgreSQL access through the RDS Data API.
- `SqlLocationDirectory`: domain helper that searches/upserts canonical `Location` rows using a generic database client.
- `AwsLocationDirectory`: legacy placeholder kept until workers switch to `SqlLocationDirectory`.

Do not put AWS secrets in Expo public environment variables. The mobile app should call an API; SQS, S3, RDB, and OpenAI credentials belong on the backend/worker side.

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

The smoke script creates the minimal `locations` table if needed, upserts `Aurora Smoke Test Location`, searches it by name, and prints the matched location.
