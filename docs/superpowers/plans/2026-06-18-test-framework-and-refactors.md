# Test Framework And Refactors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Jest and Maestro coverage, then refactor Traveler's location, region, category, and database schema code in small verified commits.

**Architecture:** Keep the database storage compatible while moving fragile business logic into testable modules. Preserve route behavior and public imports during refactors.

**Tech Stack:** Expo SDK 56, React 19, React Native 0.85, Expo Router, Drizzle ORM, `jest-expo`, React Native Testing Library, Maestro YAML flows.

## Global Constraints

- Read and follow Expo SDK 56 docs before code changes.
- Keep `src/app/sign-in.tsx` and `src/app/support.tsx`.
- Run tests before refactors and after each incremental refactor.
- Use small commits for each completed phase.
- Delete only verified unreachable code.

---

### Task 1: Testing Foundation

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Create: `jest.setup.ts`
- Create: `src/test/DbTestHelper.ts`
- Create: `src/test/EventsTestHelper.ts`
- Create: `src/test/UITestHelper.tsx`

**Interfaces:**
- Produces: `DbTestHelper.location(overrides)`, `EventsTestHelper.createRecorder()`, `UITestHelper.renderWithPaper(ui)`.

- [ ] Install Jest dependencies with Expo-compatible versions.
- [ ] Configure `test`, `test:watch`, and Jest preset.
- [ ] Add test helpers.
- [ ] Run `npm test -- --runInBand`.
- [ ] Commit `test: add jest testing foundation`.

### Task 2: Baseline Unit Tests

**Files:**
- Create tests for country-region options, dedupe helpers, saved-country grouping, category mapping, and add-source helpers.
- Modify implementation only to export pure helpers where needed.

**Interfaces:**
- Produces tested exports for helper functions without changing route behavior.

- [ ] Write failing tests for exposed helper behavior.
- [ ] Export or extract minimal helper code to pass.
- [ ] Run `npm test -- --runInBand` and `npm run lint`.
- [ ] Commit `test: cover core location behavior`.

### Task 3: Maestro Flows

**Files:**
- Create: `.maestro/add-source-form.yml`
- Create: `.maestro/add-source-save.yml`
- Modify app UI to add stable accessibility identifiers only if required.

**Interfaces:**
- Produces runnable Maestro flows for opening Add Source, saving a source, and seeing it in saved locations.

- [ ] Add flows using `launchApp`, `tapOn`, `inputText`, and `assertVisible`.
- [ ] Run unit tests and lint.
- [ ] Commit `test: add maestro source flows`.

### Task 4: Add Source Helper Refactor

**Files:**
- Create: `src/features/locations/add-source-helpers.ts`
- Modify: `src/app/add-source.tsx`

**Interfaces:**
- Produces `parseCoordinates`, `mergePhotos`, and selected-photo types from a feature helper module.

- [ ] Move tested helpers out of the route.
- [ ] Keep tests green.
- [ ] Commit `refactor: extract add source helpers`.

### Task 5: Travel Region Catalog

**Files:**
- Create: `src/constants/travel-regions.ts`
- Modify: `src/data/country-region-options.ts`
- Modify consumers as needed.

**Interfaces:**
- Produces `TravelRegionCode`, `TravelRegionCatalog`, `getTravelRegionOption`, and normalized matching helpers.

- [ ] Add curated region enum/catalog.
- [ ] Include regions in dropdown/search options.
- [ ] Preserve custom saved regions.
- [ ] Run tests and lint.
- [ ] Commit `refactor: add travel region catalog`.

### Task 6: Location Category Catalog

**Files:**
- Modify: `src/constants/location-categories.ts`
- Modify category consumers.

**Interfaces:**
- Produces typed categories with label, glyph, color, and search aliases.

- [ ] Replace small regex bucket model with typed catalog.
- [ ] Keep existing marker appearance behavior compatible.
- [ ] Run tests and lint.
- [ ] Commit `refactor: add location category catalog`.

### Task 7: Database Schema Folder

**Files:**
- Move: `src/db/schema.ts` to `src/db/schema/index.ts`
- Create: `src/db/schema/locations.ts`
- Create: `src/db/schema/location-photos.ts`
- Create: `src/db/schema/relations.ts`

**Interfaces:**
- Preserves existing `@/db/schema` imports.

- [ ] Split each table into its own file.
- [ ] Re-export current types and tables from `index.ts`.
- [ ] Run tests, lint, and `npm run db:generate` only if schema output should change.
- [ ] Commit `refactor: split database schema files`.

### Task 8: Database Diagrams

**Files:**
- Create: `src/db/README.md`

**Interfaces:**
- Produces Mermaid diagrams for tables and relationships.

- [ ] Document tables, fields, indexes, and relations.
- [ ] Run tests and lint.
- [ ] Commit `docs: add database schema diagrams`.

### Task 9: Verified Cleanup And Report

**Files:**
- Modify/delete only files proven unused.

**Interfaces:**
- Produces final report of completed changes plus recommended next tests/refactors.

- [ ] Audit usage with `rg`.
- [ ] Keep sign-in and support.
- [ ] Remove only verified dead code.
- [ ] Run final `npm test -- --runInBand` and `npm run lint`.
- [ ] Commit cleanup if changes exist.
- [ ] Report follow-up test/refactor recommendations.
