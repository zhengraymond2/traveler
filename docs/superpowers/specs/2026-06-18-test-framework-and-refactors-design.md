# Test Framework And Refactors Design

## Goal

Add reliable unit and Maestro UI test coverage for Traveler's core saved-location workflows, then refactor fragile location, region, category, and database schema code in small, independently verified commits.

## Scope

- Add Jest with `jest-expo` and React Native Testing Library for unit and component tests.
- Add `.maestro` flows for the main source-creation UI journey.
- Add reusable test helpers named `DbTestHelper`, `EventsTestHelper`, and `UITestHelper`.
- Cover location creation, saved-location listing behavior, deduplication, case-insensitive region handling, category mapping, and UI form visibility.
- Add a curated travel-region catalog layered on top of `world-countries`.
- Add a typed location-category catalog with labels and marker glyphs.
- Split Drizzle schema definitions into a schema folder.
- Add Mermaid database diagrams to `src/db/README.md`.
- Keep `src/app/sign-in.tsx` and `src/app/support.tsx`; they are reachable from the Profile tab.
- Delete only code that is verified unreachable after route and `rg` checks.

## Architecture

Pure behavior will move into small modules that can be tested without rendering route components: add-source helpers, saved-country grouping, travel-region options, category catalog lookup, and database dedupe helpers. UI tests will assert screens through accessible labels and visible text, while Maestro flows will exercise the installed native app through stable selectors.

The database schema split will preserve the public `@/db/schema` import surface by using a folder `index.ts`, so existing consumers can migrate with minimal churn. Stored database values remain strings for compatibility; enum-style helpers normalize and validate values at the application boundary.

## Testing

- `npm test -- --runInBand` is the unit-test gate.
- `npm run lint` remains the static-analysis gate.
- Maestro flows are checked in and runnable with `maestro test .maestro/...` once a native app is installed on a simulator/emulator.
- Before refactors, the newly added tests must pass against current behavior.
- After each refactor commit, unit tests and lint must be rerun.

## Commit Strategy

Commits should remain small and reversible:

1. Testing foundation and first tests.
2. Core DB/region/category coverage.
3. Maestro flows and test helpers.
4. Add-source helper extraction.
5. Region catalog refactor.
6. Category catalog refactor.
7. Database schema folder split.
8. Database README diagrams.
9. Verified unused-code cleanup, if any.

## Open Decisions

- Sign-in and support screens are kept because they are reachable.
- Events are not implemented yet; `EventsTestHelper` will be a placeholder helper for future event assertions rather than inventing an event system now.
