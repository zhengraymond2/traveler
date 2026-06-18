import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Divider, List, Surface, Text, useTheme } from 'react-native-paper';

import { useAuth } from '@/auth';
import { AppColors, MaxContentWidth } from '@/constants/theme';

export default function ProfileScreen() {
  const theme = useTheme();
  const { status, user, signOut } = useAuth();
  const isSignedIn = Boolean(user);

  async function handleLogOut() {
    await signOut();
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}>
        {isSignedIn && user ? (
          <Surface mode="flat" style={styles.section}>
            <List.Section>
              <List.Item
                title={user.displayName}
                description="Name"
                left={(props) => <List.Icon {...props} icon="account-circle-outline" />}
              />
              <Divider />
              <List.Item
                title="Export Data"
                description="Stubbed for now"
                left={(props) => <List.Icon {...props} icon="export" />}
                right={(props) => <List.Icon {...props} icon="chevron-right" />}
              />
              <Divider />
              <List.Item
                title="Import Data"
                description="Stubbed for now"
                left={(props) => <List.Icon {...props} icon="import" />}
                right={(props) => <List.Icon {...props} icon="chevron-right" />}
              />
            </List.Section>
            <Button
              mode="outlined"
              textColor={theme.colors.error}
              loading={status === 'signing-out'}
              disabled={status === 'signing-out'}
              style={[styles.logOutButton, { borderColor: theme.colors.error }]}
              onPress={handleLogOut}>
              Log out
            </Button>
          </Surface>
        ) : (
          <Surface mode="flat" style={styles.section}>
            <Text selectable variant="titleMedium" style={styles.sectionTitle}>
              Profile
            </Text>
            <Text selectable variant="bodyMedium" style={styles.mutedText}>
              Sign in or sign up to sync your saved places later.
            </Text>
            <Button mode="contained" style={styles.signInButton} onPress={() => router.push('/sign-in')}>
              Sign in
            </Button>
          </Surface>
        )}

        <Surface mode="flat" style={styles.section}>
          <List.Section>
            <List.Item
              title="About Traveler"
              left={(props) => <List.Icon {...props} icon="information-outline" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => router.push('/about-traveler')}
            />
            <Divider />
            <List.Item
              title="Support"
              left={(props) => <List.Icon {...props} icon="lifebuoy" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => router.push('/support')}
            />
          </List.Section>
        </Surface>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    padding: 16,
    gap: 16,
  },
  section: {
    gap: 12,
    borderRadius: 8,
    borderCurve: 'continuous',
    padding: 16,
    backgroundColor: AppColors.surface,
  },
  sectionTitle: {
    color: AppColors.text,
  },
  mutedText: {
    color: AppColors.textSecondary,
  },
  logOutButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  signInButton: {
    alignSelf: 'flex-start',
    borderRadius: 8,
  },
});
