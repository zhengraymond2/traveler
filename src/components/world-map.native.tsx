import Mapbox from '@rnmapbox/maps';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

const mapboxAccessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

if (mapboxAccessToken) {
  Mapbox.setAccessToken(mapboxAccessToken);
}

export function WorldMap() {
  if (!mapboxAccessToken) {
    return (
      <View style={styles.fallback}>
        <Text selectable variant="bodyMedium" style={styles.fallbackText}>
          Add EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN to show the map.
        </Text>
      </View>
    );
  }

  return (
    <Mapbox.MapView
      style={styles.map}
      styleURL={Mapbox.StyleURL.Light}
      projection="globe"
      compassEnabled={false}
      scaleBarEnabled={false}>
      <Mapbox.Camera
        centerCoordinate={[0, 20]}
        zoomLevel={0}
        minZoomLevel={0}
        animationMode="none"
      />
    </Mapbox.MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dfe9ef',
    padding: 24,
  },
  fallbackText: {
    color: '#344054',
    textAlign: 'center',
  },
});
