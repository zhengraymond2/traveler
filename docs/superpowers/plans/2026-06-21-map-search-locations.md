# Map Search Locations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the front map search find saved locations as well as saved countries/regions, centering location results at a 2x tighter Mapbox zoom scale.

**Architecture:** Extend the existing `map-region-search-options` helper so it emits country/region and saved-location options with an explicit `zoomLevel`. Generalize the map handle from country-only movement to search-result movement that accepts a coordinate and optional zoom level.

**Tech Stack:** Expo SDK 56, Expo Router, React Native, Mapbox via `@rnmapbox/maps`, Jest with `jest-expo`.

## Global Constraints

- Read `https://docs.expo.dev/versions/v56.0.0/` before writing code.
- Work in `/Users/sophiazheng/ray/expo/traveler/.worktrees/codex-map-search-locations` on branch `codex/map-search-locations`.
- Do not modify unrelated local changes in the main checkout.
- Follow TDD: write a failing Jest test before production code.
- Location result zoom is `MapTuning.countryViewZoomLevel + 1`, because one Mapbox zoom level doubles scale.

---

### Task 1: Search Options Include Saved Locations

**Files:**
- Create: `src/data/__tests__/map-region-search-options-test.ts`
- Modify: `src/data/map-region-search-options.ts`
- Modify: `src/constants/map.ts`

**Interfaces:**
- Consumes: `LocationWithPhotos[]`, `MapTuning.countryViewZoomLevel`
- Produces: `MapRegionSearchOption` with `source: 'country' | 'custom' | 'unknown' | 'location'` and `zoomLevel: number`

- [ ] **Step 1: Write the failing test**

Add tests that build options from `France` and `Mont Saint Michel`, assert a location result exists with its exact center, assert `filterMapRegionSearchOptions(options, 'mont saint michel')[0]` is the saved location, and assert location zoom equals `MapTuning.countryViewZoomLevel + 1`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/data/__tests__/map-region-search-options-test.ts --runInBand`

Expected: FAIL because location results and zoom levels are not implemented.

- [ ] **Step 3: Write minimal implementation**

Add `locationSearchZoomLevel` to `MapTuning`; add location options for named saved locations; include `zoomLevel` on all options; rank exact/prefix title matches ahead of detail-only matches.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/data/__tests__/map-region-search-options-test.ts --runInBand`

Expected: PASS.

### Task 2: Map Search Selection Uses Option Zoom

**Files:**
- Modify: `src/app/(tabs)/index.tsx`
- Modify: `src/components/world-map.native.tsx`
- Modify: `src/components/world-map.tsx`
- Modify: `src/components/map-region-search.tsx`

**Interfaces:**
- Consumes: `MapRegionSearchOption.center`, `MapRegionSearchOption.zoomLevel`
- Produces: `WorldMapHandle.moveToSearchResult(coordinate: MapCoordinate, zoomLevel?: number): boolean`

- [ ] **Step 1: Write the failing type-focused test**

Run `npm test -- src/data/__tests__/map-region-search-options-test.ts --runInBand` after changing the helper types first, then compile/lint later to catch stale `moveToCountryCoordinate` references.

- [ ] **Step 2: Write minimal implementation**

Rename the imperative handle method to `moveToSearchResult`, pass `option.zoomLevel` from the map screen, and update placeholder/accessibility/empty-state copy to mention saved locations.

- [ ] **Step 3: Run targeted tests**

Run: `npm test -- src/data/__tests__/map-region-search-options-test.ts --runInBand`

Expected: PASS.

### Task 3: Full Verification

**Files:**
- Verify all modified files.

- [ ] **Step 1: Run full test suite**

Run: `npm test -- --runInBand`

Expected: 10 suites pass with no failures.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: no lint errors.

- [ ] **Step 3: Inspect diff**

Run: `git diff --check` and `git status --short`

Expected: no whitespace errors; changes are limited to the design/plan docs, map search helper/test, map screen, search component, map constants, and world map components.
