# Trips Planner Design

## Goal

Build a first-class Trips area in Traveler. The Trips tab should have the same polish and structure as Collections: gallery cards, create flow, loading skeletons, local persistence, and card taps that navigate into a TripPlanner page. The first implementation is local-only. Trip sharing and Aurora-backed collaborative multi-write sync are intentionally designed for later, without blocking the local planner.

## Key Decisions

- Trips are their own SQLite-backed entities, not collections wearing a different label.
- The tab is a new top-level `Trips` tab alongside Map, Countries, Collections, and Profile.
- The list page mirrors Collections: local trip cards first, shared trips section scaffolded for later, create action in the section header, and tile covers based on trip/detail photos.
- The first planner implementation is local-only. Shared/collaborative trips should be represented in the model as future-ready fields, but no Aurora writes ship in this pass.
- Native iOS/Android remain the primary target. MUI X TimePicker is web React UI, so native trip date selection should use `react-native-calendars`; detail-event time-of-day controls stay native/React Native friendly.
- Google Places autocomplete should be wrapped behind a component/service boundary. It should read `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` when available and degrade to saved-location search plus pasted Google Maps links when absent.

## User Experience

### Trips Tab

The Trips tab uses the same visual language as `src/app/(tabs)/collections.tsx`:

- `Trips` section with local trips.
- `Shared Trips` section with the same section-header treatment as shared collections.
- Plus button creates a local trip.
- Cards use a 2x2 photo cover, falling back to the existing image fallback color.
- Tapping a card navigates to `/trips/[id]`.

For this pass, shared trips can be created only as local records with `kind: "shared"` if the UI needs the section to be testable. Actual collaborative sharing is deferred.

### TripPlanner Page

The TripPlanner route owns the page chrome and data loading, while the timeline stays in feature components. The main route should stay small:

- Load trip, day events, detail events, and saved locations through the repository.
- Render header title from trip name.
- Provide a header menu with at least:
  - Set start date with `react-native-calendars`.
  - Rename trip.
  - Duplicate trip.
  - Delete trip.
  - TODO: Share trip when Aurora collaboration is designed.
- Render the `TripTimeline`.

## Timeline Baseline

The collapsed timeline is a vertical line with dots. Each DayEvent row is 180 px tall.

Each row contains:

- Left label: `1`, `2`, ... `N` when no start date is set.
- Date label: `Jun 3` with abbreviated weekday beneath it in lighter grey when a start date is set.
- Center vertical timeline line and dot.
- Right content block with a small photo icon, name above it, and description further right.

The bottom of the screen fades before the native tab bar. The bottom of the timeline includes a 100 px spacer.

All timeline text should use ultralight weights where React Native supports them. Use existing app colors and avoid a one-note palette.

## DayEvent Expansion

Pressing a DayEvent expands it in place. Its collapsed row disappears and is replaced by an expanded section at least 80% of the current screen height.

The expanded section:

- Shows the DayEvent title at the top.
- Defaults title to `Day X` without a start date.
- Defaults title to a date label such as `June 22 Saturday` with a start date.
- Long press on the title enters inline title editing.
- Pressing the title while expanded collapses it.
- Expanding another DayEvent collapses the current one and opens the new one.
- Shows an hourly timeline from `00:00` through `23:59`.
- Draws a horizontal line every half hour.
- Positions DetailEvents by start/end minute, so morning/evening gaps are visible and adjacent events remain visually close.

## Adding DayEvents

Between every DayEvent, plus the top and bottom of the list, render a light grey divider with a centered grey plus circle.

Pressing the plus inserts a blank DayEvent at that index:

- Without a start date, subsequent day numbers shift by one.
- With a start date, subsequent date offsets shift by one.
- Example: inserting between Day 5 and Day 6 creates a new Day 6 and moves the old Day 6 to Day 7.
- Example: inserting between May 15 and May 16 creates a new May 16 and moves the old May 16 to May 17.

## Adding DetailEvents

When a DayEvent is expanded, tapping the hourly timeline inserts a DetailEvent at the tapped half-hour bucket with a default one-hour duration. After a 200 ms delay, open the detail-event form.

The form includes:

- Name text field.
- From/to time controls initialized to the tapped window.
- Category dropdown populated from `LocationCategoryAppearances`.
- Category chip using the same glyph and color as the map category.
- Saved-location search limited to existing saved locations.
- Light grey `or` separator.
- Address/google maps input backed by the Google autocomplete boundary when an API key is present.
- Support for pasting a full Google Maps link.
- `navigate on maps` badge after location or address selection.
- Description field.
- Existing photo gallery.
- Upload photos button using Expo ImagePicker.
- Cancel, Save, and top-right X actions.

Location fields are mutually exclusive:

- Selecting a saved location disables the address/autocomplete input.
- Entering an address or Google Maps link disables saved-location selection.
- If a saved location has a Google Maps URL, the navigate badge opens it.
- If it does not, the badge opens a Google Maps search URL using the location name.
- If an address or Google Maps link is entered directly, the badge opens that link or a Google Maps search URL.

## Data Model

Add SQLite/Drizzle tables:

- `trips`
  - `id`
  - `title`
  - `kind`: `local | shared`
  - `startDate`
  - `coverPhotoUri`
  - `sourceTripId`
  - `syncStatus`
  - `createdAt`
  - `updatedAt`
- `trip_day_events`
  - `id`
  - `tripId`
  - `position`
  - `title`
  - `description`
  - `photoUri`
  - `createdAt`
  - `updatedAt`
- `trip_detail_events`
  - `id`
  - `dayEventId`
  - `locationId`
  - `category`
  - `title`
  - `description`
  - `startMinute`
  - `endMinute`
  - `addressText`
  - `googleMapsUrl`
  - `createdAt`
  - `updatedAt`
- `trip_detail_event_photos`
  - `id`
  - `detailEventId`
  - `uri`
  - `caption`
  - `createdAt`

Repository interfaces should be separate from the existing location repository where useful, but exposed through the same database provider so screens can use one hook. Keep shared/collaboration fields nullable and inert for now.

## Component Architecture

Keep route files thin. Proposed files:

- `src/app/(tabs)/trips.tsx`: Trips list route.
- `src/app/trips/[id].tsx`: TripPlanner route.
- `src/features/trips/trip-rows.ts`: list-row derivation for gallery cards.
- `src/features/trips/trip-date-labels.ts`: day number/date label calculation.
- `src/features/trips/trip-time.ts`: minute/time utilities.
- `src/features/trips/trip-maps.ts`: Google Maps URL helpers.
- `src/components/trips/trip-gallery.tsx`: Collections-like gallery.
- `src/components/trips/trip-timeline.tsx`: main timeline shell only.
- `src/components/trips/timeline-day-row.tsx`: collapsed row.
- `src/components/trips/timeline-insert-divider.tsx`: plus divider.
- `src/components/trips/expanded-day-event.tsx`: expanded day section.
- `src/components/trips/hourly-timeline.tsx`: half-hour grid and tap mapping.
- `src/components/trips/detail-event-block.tsx`: event rendering on hourly grid.
- `src/components/trips/detail-event-form.tsx`: modal/form.
- `src/components/trips/saved-location-picker.tsx`: saved-location search.
- `src/components/trips/address-picker.tsx`: autocomplete/pasted link boundary.
- `src/db/schema/trips.ts`, `trip-day-events.ts`, `trip-detail-events.ts`, `trip-detail-event-photos.ts`.
- `src/db/trips-repository.ts`: trip reader/writer implementation.

## Tests

Use test-first implementation for behavior-heavy pieces:

- Date labels without and with a start date.
- Inserting DayEvents shifts positions/date offsets.
- Tap-to-time conversion snaps to half-hour buckets.
- DetailEvent default duration is one hour.
- Maps URL helper picks saved URL, location-name search URL, pasted URL, or address search URL correctly.
- Trip rows produce Collections-style card data and cover photos.
- Repository creates, lists, inserts, updates, and deletes trip data.
- Trips tab renders local/shared sections and navigates to TripPlanner.
- TripPlanner expands/collapses DayEvents and opens the form after timeline taps.

## Deferred Work

- Aurora-backed shared Trips with collaborative multi-write sync.
- Conflict resolution and optimistic multi-user edits.
- User invitations and permissions.
- Richer native time-of-day picker for DetailEvents if text-based `HH:mm` controls prove too light.
- Deep Google Maps link parsing beyond accepting/storing/opening pasted links.
- Full offline sync queue and retry UI.

## Expo SDK 56 References Checked

- Expo versioned docs: https://docs.expo.dev/versions/v56.0.0/
- Expo SQLite: https://docs.expo.dev/versions/v56.0.0/sdk/sqlite/
- MUI X TimePicker: https://mui.com/x/react-date-pickers/time-picker/
- React Native Google Autocomplete: https://github.com/AppAndFlow/react-native-google-autocomplete
- React Native Calendars: https://github.com/wix/react-native-calendars
