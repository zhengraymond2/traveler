import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import * as React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Divider, List, Surface, Text, useTheme } from 'react-native-paper';

import { useAuth, type AuthProviderKey, type AuthUser } from '@/auth';
import { AppColors, MaxContentWidth } from '@/constants/theme';

export default function ProfileScreen() {
  const theme = useTheme();
  const { activeProvider, isProviderAvailable, signIn, signOut, status, user } = useAuth();
  const isSignedIn = Boolean(user);
  const isSigningIn = status === 'signing-in';
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const displayName = getProfileDisplayName(user);
  const username = getProfileUsername(user);

  async function handleBatchUploadImages() {
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setErrorMessage('Photo library permission is required to import images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        mediaTypes: ['images'],
        orderedSelection: true,
        quality: 0.9,
        selectionLimit: 0,
      });

      if (result.canceled) {
        return;
      }

      const imageCount = result.assets.length;
      setStatusMessage(`Selected ${imageCount} ${imageCount === 1 ? 'image' : 'images'} for import.`);
    } catch {
      setErrorMessage('Unable to open the image importer.');
    }
  }

  async function handleImportInstagramJson() {
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: ['application/json', 'text/json'],
      });

      if (result.canceled) {
        return;
      }

      const fileName = result.assets[0]?.name ?? 'Instagram JSON';
      setStatusMessage(`Selected ${fileName} for Instagram import.`);
    } catch {
      setErrorMessage('Unable to open the Instagram JSON importer.');
    }
  }

  async function handleConnect(provider: AuthProviderKey) {
    setErrorMessage(null);
    setStatusMessage(null);

    if (!isProviderAvailable(provider)) {
      setStatusMessage(`${formatProviderName(provider)} connection is coming soon.`);
      return;
    }

    const nextUser = await signIn(provider);
    if (nextUser) {
      setStatusMessage(`Connected ${formatProviderName(provider)}.`);
    }
  }

  async function handleLogOut() {
    setErrorMessage(null);
    setStatusMessage(null);
    await signOut();
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}>
        <View style={styles.profileHeader}>
          <Text selectable variant="headlineMedium" style={styles.profileName}>
            {displayName}
          </Text>
          <Text selectable variant="titleSmall" style={styles.profileUsername}>
            {username}
          </Text>
          {statusMessage ? (
            <Text selectable variant="bodyMedium" style={styles.statusText}>
              {statusMessage}
            </Text>
          ) : null}
        </View>

        <SettingsSection title="Import/Export">
          <List.Item title="Export Data" left={(props) => <List.Icon {...props} icon="export" />} />
          <Divider />
          {errorMessage ? (
            <>
              <Text selectable variant="bodyMedium" style={[styles.errorText, { color: theme.colors.error }]}>
                {errorMessage}
              </Text>
              <Divider />
            </>
          ) : null}
          <List.Item
            title="Import Data from Images"
            left={(props) => <List.Icon {...props} icon="image-multiple-outline" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleBatchUploadImages}
          />
          <Divider />
          <List.Item
            title="Import Data from Instagram JSON"
            left={(props) => <List.Icon {...props} icon="code-json" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleImportInstagramJson}
          />
        </SettingsSection>

        <SettingsSection title="Friends">
          <List.Item
            title="Add Friends"
            left={(props) => <List.Icon {...props} icon="account-plus-outline" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => setStatusMessage('Friend invites are coming soon.')}
          />
        </SettingsSection>

        <SettingsSection title="Help">
          <List.Item
            title="About Us"
            left={(props) => <List.Icon {...props} icon="information-outline" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => router.push('/about-traveler')}
          />
          <Divider />
          <List.Item
            title="Contact"
            left={(props) => <List.Icon {...props} icon="lifebuoy" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => router.push('/support')}
          />
        </SettingsSection>

        <SettingsSection title="Login">
          <List.Item
            title="Connect Google"
            left={(props) => <List.Icon {...props} icon="google" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              void handleConnect('google');
            }}
          />
          <Divider />
          <List.Item
            title="Connect Instagram"
            left={(props) => <List.Icon {...props} icon="instagram" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => setStatusMessage('Instagram connection is coming soon.')}
          />
          <Divider />
          <List.Item
            title="Connect Apple"
            left={(props) => <List.Icon {...props} icon="apple" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              void handleConnect('apple');
            }}
          />
          {isSignedIn ? (
            <>
              <Divider />
              <View style={styles.logoutRow}>
                <Button
                  mode="outlined"
                  icon="logout"
                  textColor={theme.colors.error}
                  loading={status === 'signing-out'}
                  disabled={isSigningIn || status === 'signing-out' || Boolean(activeProvider)}
                  style={[styles.logoutButton, { borderColor: theme.colors.error }]}
                  onPress={handleLogOut}>
                  Logout
                </Button>
              </View>
            </>
          ) : null}
        </SettingsSection>
      </ScrollView>

    </View>
  );
}

function SettingsSection({ children, title }: React.PropsWithChildren<{ title: string }>) {
  return (
    <Surface mode="flat" style={styles.section}>
      <Text selectable variant="titleSmall" style={styles.sectionTitle}>
        {title}
      </Text>
      <List.Section style={styles.listSection}>{children}</List.Section>
    </Surface>
  );
}

function getProfileDisplayName(user: AuthUser | null) {
  return user?.displayName || 'Profile';
}

function getProfileUsername(user: AuthUser | null) {
  const emailPrefix = user?.email?.split('@')[0];
  const fallback = user?.displayName ?? 'traveler';
  const normalized = (emailPrefix || fallback).toLowerCase().replace(/[^a-z0-9_]/g, '');

  return `@${normalized || 'traveler'}`;
}

function formatProviderName(provider: AuthProviderKey) {
  return provider.charAt(0).toUpperCase() + provider.slice(1);
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
    paddingBottom: 32,
    gap: 16,
  },
  profileHeader: {
    paddingHorizontal: 4,
    paddingVertical: 12,
    gap: 4,
  },
  profileName: {
    color: AppColors.text,
    fontWeight: '800',
  },
  profileUsername: {
    color: AppColors.textTertiary,
    fontWeight: '500',
  },
  statusText: {
    color: AppColors.textSecondary,
    paddingTop: 8,
  },
  section: {
    borderRadius: 8,
    borderCurve: 'continuous',
    paddingHorizontal: 0,
    paddingTop: 14,
    paddingBottom: 6,
    backgroundColor: AppColors.surface,
  },
  sectionTitle: {
    color: AppColors.textSecondary,
    paddingHorizontal: 16,
    paddingBottom: 4,
    fontWeight: '700',
  },
  listSection: {
    marginBottom: 0,
    marginTop: 0,
  },
  errorText: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  logoutRow: {
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logoutButton: {
    borderRadius: 8,
  },
});
