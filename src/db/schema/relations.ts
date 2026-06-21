import { relations } from 'drizzle-orm';

import { localLocationSourceLinks } from './local-location-source-links';
import { localLocationSourcePhotos } from './local-location-source-photos';
import { localLocations } from './local-locations';
import { locationPhotos } from './location-photos';
import { locations } from './locations';

export const locationsRelations = relations(locations, ({ many }) => ({
  localLocations: many(localLocations),
  photos: many(locationPhotos),
}));

export const locationPhotosRelations = relations(locationPhotos, ({ one }) => ({
  location: one(locations, {
    fields: [locationPhotos.locationId],
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
