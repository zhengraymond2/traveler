import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from 'react-native-paper';

import { WorldMap } from '@/components/world-map';

export default function MapScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.map}>
        <WorldMap />
        <Pressable
          accessibilityLabel="Add source"
          accessibilityRole="button"
          hitSlop={12}
          style={({ pressed }) => [
            styles.addButton,
            {
              backgroundColor: theme.colors.primary,
              opacity: pressed ? 0.82 : 1,
            },
          ]}
          onPress={() => router.push('/add-source')}
        >
          <Text style={[styles.addButtonText, { color: theme.colors.onPrimary }]}>+</Text>
        </Pressable>
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
    right: 20,
    bottom: 84,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    boxShadow: '0 8px 22px rgba(0, 0, 0, 0.24)',
  },
  addButtonText: {
    marginTop: -2,
    fontSize: 36,
    fontWeight: '300',
    lineHeight: 40,
  },
});
