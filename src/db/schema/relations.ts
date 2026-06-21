import { relations } from 'drizzle-orm';

import { collectionLocations } from './collection-locations';
import { collections } from './collections';
import { locationPhotos } from './location-photos';
import { locations } from './locations';

export const locationsRelations = relations(locations, ({ many }) => ({
  collectionLocations: many(collectionLocations),
  photos: many(locationPhotos),
}));

export const locationPhotosRelations = relations(locationPhotos, ({ one }) => ({
  location: one(locations, {
    fields: [locationPhotos.locationId],
    references: [locations.id],
  }),
}));

export const collectionsRelations = relations(collections, ({ many }) => ({
  collectionLocations: many(collectionLocations),
}));

export const collectionLocationsRelations = relations(collectionLocations, ({ one }) => ({
  collection: one(collections, {
    fields: [collectionLocations.collectionId],
    references: [collections.id],
  }),
  location: one(locations, {
    fields: [collectionLocations.locationId],
    references: [locations.id],
  }),
}));
