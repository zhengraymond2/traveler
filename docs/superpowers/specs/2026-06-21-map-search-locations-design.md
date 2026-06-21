# Map Search Locations Design

## Goal

The front map search should find saved countries/regions and individual saved locations. A query such as `France` should keep finding the country/region result, while a query such as `Mont Saint Michel` should find that saved location.

## Behavior

- Build map search options from the saved locations already loaded by the map screen.
- Keep existing country/custom-region/unknown-region results.
- Add one result for each saved location with a non-empty name.
- Saved location results use their own latitude/longitude as the search center when both coordinates are finite.
- Selecting a saved location result centers the map only. It does not open the saved-location detail sheet or navigate away.
- Saved location search uses a tighter map zoom than country/region search. Because Mapbox zoom levels double scale for each +1 zoom level, saved location results use `countryViewZoomLevel + 1`.

## UI

- The collapsed search button remains in its current front-map position.
- Expanded search copy should describe countries, regions, and locations.
- Result rows should continue to show a title and optional detail.
- Saved location detail text should distinguish location results from country/region results without adding a new control.

## Architecture

- `src/data/map-region-search-options.ts` remains the source of truth for option creation, filtering, and ranking.
- `MapRegionSearchOption` gets enough metadata to represent result kind and zoom.
- The map screen passes the selected option center and zoom to `WorldMap`.
- `WorldMap` exposes a generic movement method for map search results rather than a country-only method.

## Testing

- Add Jest tests for building and filtering saved location options.
- Verify saved locations rank ahead of country/region results when the query matches the location name.
- Verify country/region results keep their existing zoom and saved location results use the location zoom.
