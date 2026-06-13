import { router, Stack } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Divider, Surface, Text, TextInput, useTheme } from 'react-native-paper';

export default function AddSourceScreen() {
  const theme = useTheme();

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Button compact mode="text" onPress={() => router.back()}>
              Cancel
            </Button>
          ),
        }}
      />

      <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}>
        <Surface mode="flat" style={styles.form}>
          <View style={styles.heading}>
            <Text selectable variant="titleMedium">
              New source
            </Text>
            <Text selectable variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Add anything you already know. Every field is optional.
            </Text>
          </View>

          <TextInput mode="outlined" label="Location name" placeholder="Cafe, hike, hotel, museum..." />

          <TextInput
            mode="outlined"
            label="GPS coordinates"
            placeholder="37.7749, -122.4194"
            keyboardType="numbers-and-punctuation"
          />

          <TextInput
            mode="outlined"
            label="Google Maps link"
            placeholder="https://maps.google.com/..."
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            mode="outlined"
            label="Instagram link"
            placeholder="https://instagram.com/..."
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.photoSection}>
            <Text selectable variant="labelLarge">
              Photos
            </Text>
            <Button mode="outlined" icon="image-plus" style={styles.photoButton}>
              Add photos
            </Button>
          </View>

          <TextInput
            multiline
            mode="outlined"
            label="Notes"
            style={styles.textArea}
            placeholder="Dishes to order, hike details, blog notes, reminders..."
          />

          <Divider />

          <View style={styles.actions}>
            <Button mode="text" onPress={() => router.back()}>
              Cancel
            </Button>
            <Button mode="contained" icon="content-save" style={styles.submitButton}>
              Save source
            </Button>
          </View>
        </Surface>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  form: {
    gap: 18,
    borderRadius: 8,
    padding: 16,
  },
  heading: {
    gap: 4,
  },
  photoSection: {
    gap: 8,
  },
  photoButton: {
    alignSelf: 'flex-start',
    borderRadius: 8,
  },
  textArea: {
    minHeight: 140,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  submitButton: {
    borderRadius: 8,
  },
});
