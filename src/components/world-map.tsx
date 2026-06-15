import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

export function WorldMap() {
  return (
    <View style={styles.fallback}>
      <Text selectable variant="bodyMedium" style={styles.fallbackText}>
        Mapbox renders in native builds.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
