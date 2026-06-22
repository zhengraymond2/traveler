# Trips Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build first-class local Trips with a Collections-like tab and a TripPlanner timeline backed by SQLite.

**Architecture:** Add Trip-specific schema and repository APIs beside the existing location/collection repository. Keep route files thin, put timeline logic in focused feature/components files, and use pure utility tests for date/time/maps behavior before UI wiring. `TripsPlan.md` is the product design source of truth.

**Tech Stack:** Expo SDK 56, Expo Router NativeTabs, React Native, React Native Paper, Expo Image/ImagePicker/Linking, react-native-calendars, Drizzle/SQLite, Jest, Testing Library React Native.

## Global Constraints

- Follow `AGENTS.md`: Expo SDK 56 docs must be checked before code; exact version docs were checked on 2026-06-22.
- Keep Trips first-class in SQLite; do not reuse Collections as trip records.
- Ship local-only behavior in this pass; Aurora collaborative sharing remains deferred.
- Use `react-native-calendars` for trip start-date selection; native screens use RN-compatible time-of-day controls.
- Use `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` for Google autocomplete when available.
- Write failing tests before production behavior changes.

---

### Task 1: Trip Utilities

**Files:**
- Create: `src/features/trips/trip-date-labels.ts`
- Create: `src/features/trips/trip-time.ts`
- Create: `src/features/trips/trip-maps.ts`
- Create: `src/features/trips/__tests__/trip-date-labels-test.ts`
- Create: `src/features/trips/__tests__/trip-time-test.ts`
- Create: `src/features/trips/__tests__/trip-maps-test.ts`

**Interfaces:**
- Produces: `getDayTimelineLabel(index, startDate)`, `getExpandedDayTitle(index, startDate, customTitle)`, `snapMinuteToHalfHour(y, height)`, `formatMinuteOfDay(minute)`, `getDetailEventMapsUrl(input)`.

- [ ] Write failing utility tests for day numbering, date labels, expanded titles, half-hour snapping, time formatting, and maps URL fallback order.
- [ ] Implement the utilities with no React dependencies.
- [ ] Run targeted tests and keep them green.

### Task 2: Trip Schema And Repository

**Files:**
- Create: `src/db/schema/trips.ts`
- Create: `src/db/schema/trip-day-events.ts`
- Create: `src/db/schema/trip-detail-events.ts`
- Create: `src/db/schema/trip-detail-event-photos.ts`
- Modify: `src/db/schema/index.ts`
- Modify: `src/db/schema/relations.ts`
- Create: `src/db/trips-repository.ts`
- Modify: `src/db/database-provider.tsx`
- Modify: `src/db/database-provider.web.tsx`
- Create: `src/db/__tests__/trips-repository-test.ts`
- Modify: `src/test/DbTestHelper.ts`
- Add generated Drizzle migration files.

**Interfaces:**
- Produces: `TripReader`, `TripWriter`, `TripRepository`, `createTripRepository(database)`.
- Consumes: existing `AppDatabase` and Drizzle schema conventions.

- [ ] Write repository tests for creating/listing trips, creating shared-local trips, inserting day events at an index, updating shifted positions, creating detail events, adding photos, and deleting cascades.
- [ ] Add schema files and relations.
- [ ] Implement `createTripRepository`.
- [ ] Expose `tripsReader` and `tripsWriter` from `useDatabase` without breaking existing `reader`/`writer` consumers.
- [ ] Generate and wire a Drizzle migration.
- [ ] Run repository tests.

### Task 3: Trips Tab

**Files:**
- Create: `src/features/trips/trip-rows.ts`
- Create: `src/features/trips/__tests__/trip-rows-test.ts`
- Create: `src/components/trips/trip-gallery.tsx`
- Create: `src/app/(tabs)/trips.tsx`
- Modify: `src/components/app-tabs.tsx`
- Create: `src/app/(tabs)/__tests__/trips-test.tsx`

**Interfaces:**
- Consumes: `tripsReader.listTripsWithDays()`, `tripsWriter.createTrip({ title, kind })`.
- Produces: a `Trips` tab mirroring Collections and navigation to `/trips/[id]`.

- [ ] Write failing row tests for cover photo selection and local/shared sorting.
- [ ] Write failing route tests for section headers, empty state, two-column cards, shared creation, and navigation.
- [ ] Implement `trip-rows` and `trip-gallery`.
- [ ] Implement `src/app/(tabs)/trips.tsx` using existing Collections patterns.
- [ ] Add NativeTabs trigger for `trips`.
- [ ] Run targeted Trips tab tests.

### Task 4: TripPlanner Timeline

**Files:**
- Create: `src/app/trips/[id].tsx`
- Create: `src/components/trips/trip-timeline.tsx`
- Create: `src/components/trips/timeline-day-row.tsx`
- Create: `src/components/trips/timeline-insert-divider.tsx`
- Create: `src/components/trips/expanded-day-event.tsx`
- Create: `src/components/trips/hourly-timeline.tsx`
- Create: `src/components/trips/detail-event-block.tsx`
- Create: `src/components/trips/__tests__/trip-timeline-test.tsx`

**Interfaces:**
- Consumes: trip repository data and utility functions from Task 1.
- Produces: collapsed 180 px DayEvent rows, insertion dividers, expanded 80% height hourly timeline, and tap-to-create DetailEvent callbacks.

- [ ] Write failing timeline tests for collapsed labels, plus dividers, expansion/collapse, and half-hour tap callback.
- [ ] Implement the timeline shell and subcomponents with stable dimensions.
- [ ] Add bottom fade and 100 px spacer.
- [ ] Run timeline component tests.

### Task 5: DetailEvent Form

**Files:**
- Create: `src/components/trips/detail-event-form.tsx`
- Create: `src/components/trips/saved-location-picker.tsx`
- Create: `src/components/trips/address-picker.tsx`
- Create: `src/components/trips/category-chip.tsx`
- Create: `src/components/trips/__tests__/detail-event-form-test.tsx`

**Interfaces:**
- Consumes: saved locations from the existing location reader, category appearances, and trip writer detail-event APIs.
- Produces: modal form with name, time range, category, mutually exclusive location/address inputs, maps badge, description, photo gallery, upload, cancel, close, and save actions.

- [ ] Install and wrap `@appandflow/react-native-google-autocomplete`.
- [ ] Write failing form tests for initial time window, category chip, location/address exclusivity, maps badge URL, cancel/close, and save.
- [ ] Implement saved-location picker using saved local locations only.
- [ ] Implement address picker with pasted Google Maps links and keyless fallback.
- [ ] Implement form save/cancel behavior.
- [ ] Run form tests.

### Task 6: Planner Route Integration

**Files:**
- Modify: `src/app/trips/[id].tsx`
- Create: `src/app/trips/__tests__/trip-planner-test.tsx`

**Interfaces:**
- Consumes: components and repository APIs from previous tasks.
- Produces: full TripPlanner route with header menu actions, local persistence, and form workflow.

- [ ] Write failing route tests for loading a trip, set start date, rename, duplicate, delete, DayEvent insertion, DetailEvent creation, and reload after save.
- [ ] Implement the route menu and data flow.
- [ ] Wire DayEvent insertion to repository writes.
- [ ] Wire DetailEvent draft creation and modal save.
- [ ] Run route tests.

### Task 7: Verification

**Files:**
- Modify as needed based on type/lint/test failures.

- [ ] Run `npm test -- --runInBand`.
- [ ] Run `npm run lint`.
- [ ] Run TypeScript or Expo lint/type command available in the repo.
- [ ] Start Expo web/native server only if needed for visual verification.
- [ ] Summarize any deferred TODOs from `TripsPlan.md`.
