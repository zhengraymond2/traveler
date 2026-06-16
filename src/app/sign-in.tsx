import { router, Stack } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Surface, Text, useTheme } from 'react-native-paper';

import { useAuth, type AuthProviderKey } from '@/auth';
import { AppColors, MaxContentWidth } from '@/constants/theme';

type SignInOption = {
  key: AuthProviderKey;
  label: string;
  icon: string;
};

const signInOptions: SignInOption[] = [
  { key: 'google', label: 'Continue with Google', icon: 'google' },
  { key: 'facebook', label: 'Continue with Facebook', icon: 'facebook' },
  { key: 'apple', label: 'Continue with Apple iCloud', icon: 'apple' },
];

export default function SignInScreen() {
  const theme = useTheme();
  const { activeProvider, errorMessage, isProviderAvailable, signIn, status } = useAuth();
  const isBusy = status === 'signing-in';

  async function handleSignIn(provider: AuthProviderKey) {
    const signedInUser = await signIn(provider);
    if (signedInUser) {
      router.replace('/profile');
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Sign in' }} />
      <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}>
        <Surface mode="flat" style={styles.card}>
          <Text selectable variant="headlineSmall" style={styles.title}>
            Sign in or sign up
          </Text>
          <Text selectable variant="bodyMedium" style={styles.body}>
            Traveler only supports Google, Facebook, and Apple sign-in.
          </Text>

          <View style={styles.buttonStack}>
            {signInOptions.map((option) => {
              const isAvailable = isProviderAvailable(option.key);
              const isActive = activeProvider === option.key;

              return (
                <Button
                  key={option.key}
                  mode="outlined"
                  icon={option.icon}
                  loading={isActive}
                  disabled={isBusy || !isAvailable}
                  style={styles.providerButton}
                  contentStyle={styles.providerButtonContent}
                  onPress={() => {
                    void handleSignIn(option.key);
                  }}>
                  {isAvailable ? option.label : `${option.label} soon`}
                </Button>
              );
            })}
          </View>

          {errorMessage ? (
            <Text selectable variant="bodySmall" style={[styles.errorText, { color: theme.colors.error }]}>
              {errorMessage}
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
    justifyContent: 'center',
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
  body: {
    color: AppColors.textSecondary,
  },
  buttonStack: {
    gap: 12,
  },
  providerButton: {
    borderColor: AppColors.outline,
  },
  providerButtonContent: {
    minHeight: 48,
  },
  errorText: {
    textAlign: 'center',
  },
});
