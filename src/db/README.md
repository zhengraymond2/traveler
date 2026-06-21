# Database Schema

Traveler stores saved places in SQLite through Drizzle ORM. The schema keeps canonical cached location data separate from private local source data.

## Entity Relationship Diagram

```mermaid
erDiagram
  locations ||--o{ location_photos : has
  locations ||--o{ local_locations : caches
  local_locations ||--o{ local_location_source_photos : has
  local_locations ||--o{ local_location_source_links : has

  locations {
    text id PK
    text name
    real latitude
    real longitude
    text google_maps_url
    text instagram_url
    text instagram_feed_url
    text trail_map_url
    text field_confidence_json
    text notes
    text country
    text category
    integer created_at
    integer updated_at
  }

  location_photos {
    text id PK
    text location_id FK
    text uri
    text caption
    integer created_at
  }

  local_locations {
    text id PK
    text canonical_location_id FK
    text status
    text private_description
    text last_partial_location_id
    integer added_at
    integer updated_at
  }

  local_location_source_photos {
    text id PK
    text local_location_id FK
    text uri
    integer created_at
  }

  local_location_source_links {
    text id PK
    text local_location_id FK
    text url
    text kind
    integer created_at
  }
```

## Table Details

```mermaid
flowchart TD
  locations["locations\nCached canonical place records"] --> locationPhotos["location_photos\nLegacy photos attached to a saved place"]
  locations --> localLocations["local_locations\nPrivate user-owned saved records"]
  localLocations --> sourcePhotos["local_location_source_photos\nPrivate source images"]
  localLocations --> sourceLinks["local_location_source_links\nPrivate source links"]
  locationPhotos --> cascade["ON DELETE CASCADE\nDeleting a location removes its photos"]
  sourcePhotos --> localCascade["ON DELETE CASCADE\nDeleting a local location removes private source data"]
  sourceLinks --> localCascade
```

### `locations`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `text` | Primary key generated locally. |
| `name` | `text` | Optional display name. |
| `latitude` | `real` | Optional GPS latitude. |
| `longitude` | `real` | Optional GPS longitude. |
| `google_maps_url` | `text` | Optional external map link. |
| `instagram_url` | `text` | Legacy optional social link. |
| `instagram_feed_url` | `text` | Optional canonical public Instagram location/hashtag feed URL. |
| `trail_map_url` | `text` | Optional trail map link. |
| `field_confidence_json` | `text` | Optional JSON confidence scores returned by recognition. |
| `notes` | `text` | Optional user notes. |
| `country` | `text` | Country or curated travel region label. |
| `category` | `text` | Traveler category label normalized by app helpers. |
| `created_at` | `integer` | Required timestamp in milliseconds. |
| `updated_at` | `integer` | Required timestamp in milliseconds. |

Indexes:

- `locations_country_idx` on `country`
- `locations_category_idx` on `category`
- `locations_created_at_idx` on `created_at`

### `local_locations`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `text` | Primary key generated locally. |
| `canonical_location_id` | `text` | Optional link to cached canonical `locations.id`. |
| `status` | `text` | Recognition status: processing, matched, needsReview, or failed. |
| `private_description` | `text` | User-provided private notes/description. |
| `last_partial_location_id` | `text` | Last queued recognition event associated with this record. |
| `added_at` | `integer` | Required timestamp in milliseconds for recently-added grouping. |
| `updated_at` | `integer` | Required timestamp in milliseconds. |

Indexes:

- `local_locations_canonical_location_id_idx` on `canonical_location_id`
- `local_locations_status_idx` on `status`
- `local_locations_added_at_idx` on `added_at`

### `local_location_source_photos`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `text` | Primary key generated locally. |
| `local_location_id` | `text` | Required foreign key to `local_locations.id`. |
| `uri` | `text` | Required private source photo URI. |
| `created_at` | `integer` | Required timestamp in milliseconds. |

Indexes:

- `local_location_source_photos_local_location_id_idx` on `local_location_id`

### `local_location_source_links`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `text` | Primary key generated locally. |
| `local_location_id` | `text` | Required foreign key to `local_locations.id`. |
| `url` | `text` | Required private source URL. |
| `kind` | `text` | Source link kind such as instagram, google-maps, alltrails, or web. |
| `created_at` | `integer` | Required timestamp in milliseconds. |

Indexes:

- `local_location_source_links_local_location_id_idx` on `local_location_id`
- `local_location_source_links_url_idx` on `url`

### `location_photos`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `text` | Primary key generated locally. |
| `location_id` | `text` | Required foreign key to `locations.id`. |
| `uri` | `text` | Required local or remote photo URI. |
| `caption` | `text` | Optional caption. |
| `created_at` | `integer` | Required timestamp in milliseconds. |

Indexes:

- `location_photos_location_id_idx` on `location_id`
