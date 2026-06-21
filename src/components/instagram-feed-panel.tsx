import * as React from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { AppColors } from '@/constants/theme';

export function InstagramFeedPanel({ feedUrl }: { feedUrl: string | null | undefined }) {
  if (!feedUrl) {
    return null;
  }

  return (
    <View style={styles.panel}>
      <Text selectable variant="titleMedium" style={styles.title}>
        Public Instagram feed
      </Text>
      <Pressable accessibilityRole="link" style={styles.linkRow} onPress={() => Linking.openURL(feedUrl)}>
        <Text selectable={false} variant="titleMedium" style={styles.linkText}>
          Open Instagram feed
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: 8,
  },
  title: {
    color: AppColors.text,
    fontWeight: '800',
  },
  linkRow: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  linkText: {
    color: AppColors.primary,
    fontWeight: '700',
  },
});
