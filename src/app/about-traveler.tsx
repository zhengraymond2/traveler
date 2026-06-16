import { Stack } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { Surface, Text, useTheme } from 'react-native-paper';

import { AppColors, MaxContentWidth } from '@/constants/theme';

export default function AboutTravelerScreen() {
  const theme = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'About Traveler', headerBackButtonDisplayMode: 'minimal' }} />
      <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}>
        <Surface mode="flat" style={styles.card}>
          <Text selectable variant="headlineSmall" style={styles.title}>
            Traveler
          </Text>
          <Text selectable variant="bodyMedium" style={styles.body}>
            Traveler helps collect places over time, view them on a map, and turn saved ideas into actual
            travel plans. Saved records can include coordinates, links, notes, photos, and trip memories.
          </Text>
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
    flexGrow: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    padding: 16,
  },
  card: {
    gap: 12,
    padding: 20,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: AppColors.surface,
  },
  title: {
    color: AppColors.text,
  },
  body: {
    color: AppColors.bodyText,
    lineHeight: 22,
  },
});
