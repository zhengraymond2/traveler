import type { TripKind } from '@/db/schema';
import type { TripWithDays } from '@/db/trips-repository';

export type TripRowSource = TripWithDays;

export type TripRow = {
  id: string;
  imageUris: string[];
  kind: TripKind;
  title: string;
};

export function getTripRows(trips: TripRowSource[]): TripRow[] {
  return trips.map((trip) => ({
    id: trip.id,
    imageUris: getTripPhotoUris(trip).slice(0, 4),
    kind: trip.kind,
    title: trip.title,
  }));
}

function getTripPhotoUris(trip: TripRowSource) {
  return [
    trip.coverPhotoUri,
    ...trip.dayEvents.map((dayEvent) => dayEvent.photoUri),
    ...trip.dayEvents.flatMap((dayEvent) =>
      dayEvent.detailEvents.flatMap((detailEvent) => detailEvent.photos.map((photo) => photo.uri))
    ),
  ].filter((uri): uri is string => Boolean(uri));
}
