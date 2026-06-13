import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { FAB, Surface, useTheme } from 'react-native-paper';

export default function MapScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface mode="flat" style={styles.mapPlaceholder}>
        <FAB
          icon="plus"
          mode="elevated"
          size="medium"
          style={styles.addButton}
          onPress={() => router.push('/add-source')}
        />
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  mapPlaceholder: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#d92d20',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    padding: 16,
  },
  addButton: {
    borderRadius: 16,
  },
});
