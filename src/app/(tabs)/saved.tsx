import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, Chip, Text, useTheme } from 'react-native-paper';

const countries = ['Japan', 'Portugal', 'Mexico', 'Iceland'];

export default function SavedLocationsScreen() {
  const theme = useTheme();

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.countryList}>
        {countries.map((country) => (
          <Chip key={country} mode="flat" compact>
            {country}
          </Chip>
        ))}
      </ScrollView>

      <Card mode="elevated" style={styles.row}>
        <Card.Content style={styles.rowContent}>
          <View style={[styles.imagePlaceholder, { backgroundColor: theme.colors.surfaceVariant }]} />
          <View style={styles.rowCopy}>
            <Text selectable variant="titleMedium">
              Saved location
            </Text>
            <Text selectable variant="bodyMedium">
              Description and notes will go here.
            </Text>
            <Text selectable variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Country · category · source
            </Text>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    gap: 18,
    padding: 16,
    paddingBottom: 32,
  },
  countryList: {
    gap: 8,
    paddingVertical: 4,
  },
  row: {
    borderRadius: 8,
  },
  rowContent: {
    flexDirection: 'row',
    gap: 14,
  },
  imagePlaceholder: {
    width: 108,
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: '#d9dee5',
  },
  rowCopy: {
    flex: 1,
    justifyContent: 'center',
    gap: 10,
  },
});
