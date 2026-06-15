import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { FAB, useTheme } from 'react-native-paper';

import { WorldMap } from '@/components/world-map';

export default function MapScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.map}>
        <WorldMap />
        <FAB
          icon="plus"
          mode="elevated"
          size="medium"
          style={styles.addButton}
          onPress={() => router.push('/add-source')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  addButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    borderRadius: 16,
  },
});
