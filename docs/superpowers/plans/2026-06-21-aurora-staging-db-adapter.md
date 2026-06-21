# Aurora Staging DB Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a server-side Aurora staging database adapter so the recognition pipeline can read and write canonical `Location` rows through a generic database interface.

**Architecture:** Keep the React Native app talking to a service/API boundary. Add a generic `DatabaseClient` contract, an AWS Aurora Data API implementation for server/worker code, and a SQL-backed `LocationDirectory` helper for the `locations` table.

**Tech Stack:** Expo SDK 56, TypeScript, Jest, AWS Aurora PostgreSQL Data API, AWS SDK for JavaScript v3, existing local test services.

## Global Constraints

- Do not remove or weaken the local testing services under `test/`.
- Do not ship Aurora credentials in the React Native client.
- Staging is the only AWS environment for this task; production config is documented as a later duplicate.
- Use tests first for behavior changes.
- Keep `LocationDirectory` as a domain interface and introduce a generic DB interface below it.

---

### Task 1: Generic Database Contract

**Files:**
- Create: `src/services/contracts/database.ts`
- Modify: `src/services/contracts/index.ts`
- Test: `src/services/contracts/__tests__/database-test.ts`

**Interfaces:**
- Produces: `DatabaseClient`, `DatabaseStatement`, `DatabaseValue`, `DatabaseRow`, `DatabaseResult`, `DatabaseTransaction`
- Consumes: none

- [ ] **Step 1: Write the failing test**

```ts
import type { DatabaseStatement } from '../database';

test('DatabaseStatement carries sql text and named parameters', () => {
  const statement: DatabaseStatement = {
    sql: 'select * from locations where id = :id',
    parameters: { id: 'location-1' },
  };

  expect(statement.parameters?.id).toBe('location-1');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand src/services/contracts/__tests__/database-test.ts`
Expected: FAIL because `../database` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `database.ts` with primitive value, row, result, statement, transaction, and client types. Export it from `contracts/index.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand src/services/contracts/__tests__/database-test.ts`
Expected: PASS.

### Task 2: SQL Location Directory

**Files:**
- Create: `src/services/db/sql-location-directory.ts`
- Create: `src/services/db/__tests__/sql-location-directory-test.ts`

**Interfaces:**
- Consumes: `DatabaseClient`, `LocationDirectory`, `PartialLocation`, `RecognizedLocation`
- Produces: `SqlLocationDirectory`

- [ ] **Step 1: Write failing tests**

Tests cover search by exact normalized name, search by Google Maps URL, search by nearby GPS, and upsert of recognized locations.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --runInBand src/services/db/__tests__/sql-location-directory-test.ts`
Expected: FAIL because `SqlLocationDirectory` does not exist.

- [ ] **Step 3: Implement minimal SQL helper**

Implement `search(input)` with conservative SQL clauses and scoring in TypeScript. Implement `upsertLocation(input)` with an `insert ... on conflict (id) do update` statement using a generated location id derived from normalized name or a timestamp fallback.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --runInBand src/services/db/__tests__/sql-location-directory-test.ts`
Expected: PASS.

### Task 3: AWS Aurora Data API Database

**Files:**
- Create: `src/services/aws/aws-aurora-data-api-database.ts`
- Create: `src/services/aws/staging-config.ts`
- Create: `src/services/aws/__tests__/aws-aurora-data-api-database-test.ts`
- Modify: `src/services/aws/README.md`

**Interfaces:**
- Consumes: `DatabaseClient`, AWS SDK RDS Data API client shape
- Produces: `AwsAuroraDataApiDatabase`, `createAwsStagingDatabaseFromEnv`, `loadAwsStagingDatabaseConfigFromEnv`

- [ ] **Step 1: Write failing tests**

Tests cover env config loading, SQL parameter conversion, result-row conversion, and transaction begin/commit/rollback command flow.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --runInBand src/services/aws/__tests__/aws-aurora-data-api-database-test.ts`
Expected: FAIL because the adapter does not exist.

- [ ] **Step 3: Implement minimal AWS adapter**

Use dynamic imports for `@aws-sdk/client-rds-data` so app tests can mock the client and mobile bundles do not eagerly load the server dependency. Convert database values to Data API parameter values and Data API records back to plain rows.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --runInBand src/services/aws/__tests__/aws-aurora-data-api-database-test.ts`
Expected: PASS.

### Task 4: Aurora Smoke Script and Docs

**Files:**
- Create: `scripts/aurora-location-smoke-test.ts`
- Modify: `package.json`
- Modify: `docs/location-recognition-aws-rollout.md`
- Modify: `src/services/aws/README.md`

**Interfaces:**
- Consumes: `createAwsStagingDatabaseFromEnv`, `SqlLocationDirectory`
- Produces: `npm run aws:aurora:smoke`

- [ ] **Step 1: Write smoke script**

The script loads staging env, creates the `locations` table if missing, upserts a smoke-test location, searches it by name, and prints the resulting location id/name.

- [ ] **Step 2: Add npm script**

Add `aws:aurora:smoke` using `tsx scripts/aurora-location-smoke-test.ts`.

- [ ] **Step 3: Add dependency**

Add `@aws-sdk/client-rds-data` and `tsx` to project dependencies/devDependencies.

- [ ] **Step 4: Verify**

Run targeted tests, `npm run lint`, `npx tsc --noEmit`, and document that the smoke script requires real AWS env vars.
