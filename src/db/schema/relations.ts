import { relations } from 'drizzle-orm';

import { collectionLocations } from './collection-locations';
import { collections } from './collections';
import { localLocationSourceLinks } from './local-location-source-links';
import { localLocationSourcePhotos } from './local-location-source-photos';
import { localLocations } from './local-locations';
import { locationPhotos } from './location-photos';
import { locations } from './locations';
import { tripDayEvents } from './trip-day-events';
import { tripDetailEventPhotos } from './trip-detail-event-photos';
import { tripDetailEvents } from './trip-detail-events';
import { trips } from './trips';

export const locationsRelations = relations(locations, ({ many }) => ({
  collectionLocations: many(collectionLocations),
  localLocations: many(localLocations),
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

export const localLocationsRelations = relations(localLocations, ({ many, one }) => ({
  canonicalLocation: one(locations, {
    fields: [localLocations.canonicalLocationId],
    references: [locations.id],
  }),
  sourceLinks: many(localLocationSourceLinks),
  sourcePhotos: many(localLocationSourcePhotos),
}));

export const localLocationSourcePhotosRelations = relations(localLocationSourcePhotos, ({ one }) => ({
  localLocation: one(localLocations, {
    fields: [localLocationSourcePhotos.localLocationId],
    references: [localLocations.id],
  }),
}));

export const localLocationSourceLinksRelations = relations(localLocationSourceLinks, ({ one }) => ({
  localLocation: one(localLocations, {
    fields: [localLocationSourceLinks.localLocationId],
    references: [localLocations.id],
  }),
}));

export const tripsRelations = relations(trips, ({ many }) => ({
  dayEvents: many(tripDayEvents),
}));

export const tripDayEventsRelations = relations(tripDayEvents, ({ many, one }) => ({
  detailEvents: many(tripDetailEvents),
  trip: one(trips, {
    fields: [tripDayEvents.tripId],
    references: [trips.id],
  }),
}));

export const tripDetailEventsRelations = relations(tripDetailEvents, ({ many, one }) => ({
  dayEvent: one(tripDayEvents, {
    fields: [tripDetailEvents.dayEventId],
    references: [tripDayEvents.id],
  }),
  location: one(locations, {
    fields: [tripDetailEvents.locationId],
    references: [locations.id],
  }),
  photos: many(tripDetailEventPhotos),
}));

export const tripDetailEventPhotosRelations = relations(tripDetailEventPhotos, ({ one }) => ({
  detailEvent: one(tripDetailEvents, {
    fields: [tripDetailEventPhotos.detailEventId],
    references: [tripDetailEvents.id],
  }),
}));
