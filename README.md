# Traveler

Traveler is an Expo Router app for saving, organizing, and revisiting travel locations.

## Setup

Install exactly from the committed lockfile:

```bash
npm ci
```

Start the app:

```bash
npx expo start
```

Run iOS or Android development builds:

```bash
npm run ios
npm run android
```

## Staging Vision Pipeline

The location-recognition pipeline is built behind service contracts so local fakes, staging AWS services, and future production services can share the same app-facing code.

Server-side staging variables live in `.env` and should not use `EXPO_PUBLIC_*` names:

- `AWS_REGION`
- `LOCATION_RECOGNITION_QUEUE_URL`
- `LOCATION_RECOGNITION_DLQ_URL`
- `LOCATION_BLOB_BUCKET`
- `TRAVELER_AURORA_RESOURCE_ARN`
- `TRAVELER_AURORA_SECRET_ARN`
- `TRAVELER_AURORA_DATABASE=traveler_staging`
- `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` when paid vision calls are enabled later

Useful staging checks:

```bash
npm run aws:aurora:smoke
npm run aws:sqs:smoke
npm run aws:s3:smoke
npm run api:smoke
npm run worker:fixture-smoke
```

`worker:fixture-smoke` intentionally uses a deterministic recognizer fixture instead of OpenRouter. It proves the queue, worker, and Aurora write path without spending on vision calls.

Saved locations are listed from local SQLite `local_locations`. Canonical place metadata is cached in local SQLite `locations` and refreshed from Aurora through the location API. Aurora also stores canonical Instagram source links so repeat shares of the same Instagram URL can match without another LLM call.

## Dependency Workflow

This project exact-pins direct dependencies in `package.json` and commits `package-lock.json`. Use `npm ci` for reproducible installs.

For Expo SDK and React Native native packages, prefer Expo's version-aware installer:

```bash
npx expo install <package-name>
```

After changing dependencies, check the diff in both `package.json` and `package-lock.json`. For Expo SDK packages, run:

```bash
npx expo install --check
```

Do not hand-edit transitive dependency versions. Let `package-lock.json` record the resolved tree.

## Local Commands

```bash
npm test
npm run lint
npm run brand:validate
```

Database migrations are generated with:

```bash
npm run db:generate
```
