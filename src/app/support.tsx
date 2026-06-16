import * as React from 'react';
import { Stack } from 'expo-router';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Surface, Text, TextInput, useTheme } from 'react-native-paper';

import { AppColors, MaxContentWidth } from '@/constants/theme';

const supportEmail = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;

export default function SupportScreen() {
  const theme = useTheme();
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleSubmit() {
    const recipient = supportEmail?.trim();
    if (!recipient) {
      setStatusMessage('Set EXPO_PUBLIC_SUPPORT_EMAIL to send support messages.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    const body = [`Name: ${name || 'Not provided'}`, `Email: ${email || 'Not provided'}`, '', message].join('\n');
    const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(
      'Traveler support request'
    )}&body=${encodeURIComponent(body)}`;

    try {
      const canOpenMail = await Linking.canOpenURL(mailtoUrl);
      if (!canOpenMail) {
        setStatusMessage('No mail app is available to send this message.');
        return;
      }

      await Linking.openURL(mailtoUrl);
      setStatusMessage('Support message opened in Mail.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to send support message.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Support', headerBackButtonDisplayMode: 'minimal' }} />
      <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <Surface mode="flat" style={styles.card}>
          <Text selectable variant="headlineSmall" style={styles.title}>
            Support
          </Text>
          <View style={styles.fields}>
            <TextInput label="Name" mode="outlined" value={name} onChangeText={setName} />
            <TextInput
              label="Email"
              mode="outlined"
              value={email}
              keyboardType="email-address"
              autoCapitalize="none"
              onChangeText={setEmail}
            />
            <TextInput
              label="Message"
              mode="outlined"
              value={message}
              multiline
              numberOfLines={6}
              style={styles.messageInput}
              onChangeText={setMessage}
            />
          </View>
          <Button
            mode="contained"
            loading={isSubmitting}
            disabled={isSubmitting || !message.trim()}
            onPress={handleSubmit}>
            Submit
          </Button>
          {statusMessage ? (
            <Text selectable variant="bodySmall" style={styles.statusText}>
              {statusMessage}
            </Text>
          ) : null}
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
    gap: 16,
    padding: 20,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: AppColors.surface,
  },
  title: {
    color: AppColors.text,
  },
  fields: {
    gap: 12,
  },
  messageInput: {
    minHeight: 140,
  },
  statusText: {
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
});
