import { Image } from 'expo-image';
import * as React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { PulsingView } from '@/components/pulsing-view';
import { AppColors } from '@/constants/theme';
import type { TripRow } from '@/features/trips/trip-rows';

type TripGalleryProps = {
  isLoading: boolean;
  onOpenTrip: (id: string) => void;
  shared?: boolean;
  trips: TripRow[];
};

export function TripGallery({ isLoading, onOpenTrip, shared = false, trips }: TripGalleryProps) {
  return (
    <View style={styles.galleryGrid}>
      {trips.map((trip) => (
        <TripGalleryCard
          key={trip.id}
          isLoading={isLoading}
          shared={shared}
          trip={trip}
          onOpenTrip={onOpenTrip}
        />
      ))}
    </View>
  );
}

function TripGalleryCard({
  isLoading,
  onOpenTrip,
  shared,
  trip,
}: {
  isLoading: boolean;
  onOpenTrip: (id: string) => void;
  shared: boolean;
  trip: TripRow;
}) {
  return (
    <View style={styles.galleryCard} testID={`trip-gallery-card-${trip.id}`}>
      <PulsingView active={isLoading}>
        <Pressable
          accessibilityLabel={`${shared ? 'Open shared trip' : 'Open trip'} ${trip.title}`}
          accessibilityRole="button"
          disabled={isLoading}
          style={styles.galleryPressable}
          onPress={() => onOpenTrip(trip.id)}>
          <TripCover trip={trip} />
          <Text selectable={false} variant="titleSmall" numberOfLines={2} style={styles.galleryTitle}>
            {trip.title}
          </Text>
        </Pressable>
      </PulsingView>
    </View>
  );
}

function TripCover({ trip }: { trip: TripRow }) {
  return (
    <View testID={`trip-gallery-cover-${trip.id}`} style={styles.galleryCover}>
      {Array.from({ length: 4 }).map((_, index) => {
        const uri = trip.imageUris[index];

        return (
          <View key={index} style={styles.galleryTileSlot}>
            {uri ? (
              <Image source={{ uri }} style={styles.galleryTile} contentFit="cover" />
            ) : (
              <View style={[styles.galleryTile, styles.galleryTileFallback]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

export function LoadingTripRows() {
  return (
    <View style={styles.skeletonContent}>
      {Array.from({ length: 4 }).map((_, index) => (
        <View key={index} style={styles.galleryCard}>
          <PulsingView active>
            <View style={styles.skeletonCover}>
              <View style={styles.skeletonLine} />
            </View>
          </PulsingView>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    rowGap: 18,
  },
  galleryCard: {
    width: '50%',
    paddingHorizontal: 4,
  },
  galleryPressable: {
    gap: 7,
  },
  galleryCover: {
    aspectRatio: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden',
    borderRadius: 4,
    backgroundColor: AppColors.imageFallback,
    borderCurve: 'continuous',
  },
  galleryTileSlot: {
    width: '50%',
    height: '50%',
    padding: 1,
  },
  galleryTile: {
    width: '100%',
    height: '100%',
    backgroundColor: AppColors.surfaceVariant,
  },
  galleryTileFallback: {
    backgroundColor: AppColors.imageFallback,
  },
  galleryTitle: {
    color: AppColors.text,
    fontWeight: '200',
    paddingHorizontal: 2,
  },
  skeletonContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    rowGap: 18,
  },
  skeletonCover: {
    aspectRatio: 1,
    borderRadius: 4,
    backgroundColor: AppColors.surfaceVariant,
    borderCurve: 'continuous',
    justifyContent: 'flex-end',
    padding: 14,
  },
  skeletonLine: {
    width: '58%',
    height: 10,
    borderRadius: 5,
    backgroundColor: AppColors.imageFallback,
  },
});
