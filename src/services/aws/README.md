# AWS Recognition Service Stubs

The app uses service contracts from `src/services/contracts`. These AWS classes are placeholders for the server-side implementation and intentionally throw until configured.

Planned mapping:

- `AwsEventsReader` / `AwsEventsWriter`: SQS queue consumer/producer.
- `AwsBlobStore`: S3 object storage for server-side blobs.
- `AwsLocationDirectory`: API/RDB-backed canonical location search and upsert.

Do not put AWS secrets in Expo public environment variables. The mobile app should call an API; SQS, S3, RDB, and OpenAI credentials belong on the backend/worker side.
