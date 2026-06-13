import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput, useTheme } from 'react-native-paper';

export default function AddSourceScreen() {
  const theme = useTheme();

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}>
      <View style={styles.form}>
        <Text selectable variant="titleMedium">
          New source
        </Text>

        <TextInput mode="outlined" label="Source URL" placeholder="Instagram post, blog, map link..." />

        <TextInput
          multiline
          mode="outlined"
          label="Notes"
          style={styles.textArea}
          placeholder="What should future-you remember?"
        />

        <Button mode="contained" icon="content-save" style={styles.submitButton}>
          Save source
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  form: {
    gap: 18,
  },
  textArea: {
    minHeight: 140,
  },
  submitButton: {
    borderRadius: 8,
  },
});
