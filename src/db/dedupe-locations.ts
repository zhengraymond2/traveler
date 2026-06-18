import { asc, eq, inArray } from 'drizzle-orm';

import type { AppDatabase } from './client';
import { locationPhotos, locations, type Location, type LocationPhoto } from './schema';

export async function dedupeLocationRecord(database: AppDatabase, record: Location): Promise<Location> {
  const recordKey = getDedupeLocationKey(record);
  if (!recordKey) {
    return record;
  }

  const allLocations = await database.select().from(locations).orderBy(asc(locations.createdAt));
  const duplicateLocations = allLocations.filter(
    (location) => getDedupeLocationKey(location) === recordKey
  );

  if (duplicateLocations.length <= 1) {
    return record;
  }

  const [canonicalLocation, ...locationsToMerge] = duplicateLocations;
  const locationIds = duplicateLocations.map((location) => location.id);
  const photos = await database
    .select()
    .from(locationPhotos)
    .where(inArray(locationPhotos.locationId, locationIds))
    .orderBy(asc(locationPhotos.createdAt));
  const canonicalPhotos = photos.filter((photo) => photo.locationId === canonicalLocation.id);
  const mergedPhotos = collectUniquePhotos(canonicalLocation.id, photos);
  const mergedNotes = collectUniqueNotes(duplicateLocations.map((location) => location.notes));
  const now = new Date();

  await database
    .update(locations)
    .set({
      notes: mergedNotes,
      updatedAt: now,
    })
    .where(eq(locations.id, canonicalLocation.id));

  if (canonicalPhotos.length) {
    await database.delete(locationPhotos).where(inArray(locationPhotos.id, canonicalPhotos.map((photo) => photo.id)));
  }

  if (mergedPhotos.length) {
    await database.insert(locationPhotos).values(mergedPhotos);
  }

  await database.delete(locations).where(inArray(locations.id, locationsToMerge.map((location) => location.id)));

  const [dedupedLocation] = await database.select().from(locations).where(eq(locations.id, canonicalLocation.id)).limit(1);
  if (!dedupedLocation) {
    throw new Error('Unable to load deduplicated location.');
  }

  return dedupedLocation;
}

function collectUniquePhotos(canonicalLocationId: string, photos: LocationPhoto[]) {
  const seenUris = new Set<string>();
  const uniquePhotos = photos.filter((photo) => {
    if (seenUris.has(photo.uri)) {
      return false;
    }

    seenUris.add(photo.uri);
    return true;
  });

  return uniquePhotos.map((photo) => ({
    id: photo.id,
    locationId: canonicalLocationId,
    uri: photo.uri,
    caption: photo.caption,
    createdAt: photo.createdAt,
  }));
}

function collectUniqueNotes(notes: (string | null)[]) {
  const seenNotes = new Set<string>();
  const uniqueNotes = notes
    .map((note) => note?.trim())
    .filter((note): note is string => {
      if (!note || seenNotes.has(note)) {
        return false;
      }

      seenNotes.add(note);
      return true;
    });

  return uniqueNotes.length ? uniqueNotes.join('\n\n') : null;
}

export function getDedupeLocationKey(record: Pick<Location, 'country' | 'name'>) {
  const nameKey = normalizeDedupeText(record.name);
  if (!nameKey) {
    return null;
  }

  return `${nameKey}:${normalizeDedupeText(record.country) ?? ''}`;
}

function normalizeDedupeText(value: string | null | undefined) {
  const normalized = value?.trim().toLocaleLowerCase();
  return normalized || null;
}
