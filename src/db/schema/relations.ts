import { relations } from 'drizzle-orm';

import { locationPhotos } from './location-photos';
import { locations } from './locations';

export const locationsRelations = relations(locations, ({ many }) => ({
  photos: many(locationPhotos),
}));

export const locationPhotosRelations = relations(locationPhotos, ({ one }) => ({
  location: one(locations, {
    fields: [locationPhotos.locationId],
    references: [locations.id],
  }),
}));
