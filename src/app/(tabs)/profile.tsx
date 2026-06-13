import { ScrollView, StyleSheet } from 'react-native';
import { List, Surface, Text, useTheme } from 'react-native-paper';

export default function ProfileScreen() {
  const theme = useTheme();

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}>
      <Surface mode="flat" style={styles.section}>
        <Text selectable variant="titleMedium">
          Profile & Settings
        </Text>
        <List.Section>
          <List.Item title="Sign in" left={(props) => <List.Icon {...props} icon="account" />} />
          <List.Item title="App settings" left={(props) => <List.Icon {...props} icon="cog" />} />
          <List.Item
            title="Export data"
            left={(props) => <List.Icon {...props} icon="export" />}
          />
        </List.Section>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 16,
  },
  section: {
    minHeight: 160,
    borderRadius: 8,
    padding: 16,
  },
});
