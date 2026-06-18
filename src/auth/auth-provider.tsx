import * as React from 'react';

import { DEV_MODE } from '@/constants/dev-mode';

import { createAnonymousDisplayName, createInitials } from './anonymous-name';
import { deloadCloudDataFromLocalDatabase, loadCloudDataIntoLocalDatabase } from './cloud-sync';

import type { AuthProviderKey, AuthUser, ExternalAuthIdentity } from './types';

type AuthStatus = 'idle' | 'signing-in' | 'signing-out';

type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  activeProvider: AuthProviderKey | null;
  errorMessage: string | null;
  isProviderAvailable: (provider: AuthProviderKey) => boolean;
  signIn: (provider: AuthProviderKey) => Promise<AuthUser | null>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

const devUserId = 'traveler-existing-dev-user';
const devUserEmail = 'dev@traveler.local';
const devDefaultProvider: AuthProviderKey = 'apple';

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = React.useState<AuthUser | null>(() =>
    DEV_MODE ? createAuthUser(createDevIdentity(devDefaultProvider)) : null
  );
  const [status, setStatus] = React.useState<AuthStatus>('idle');
  const [activeProvider, setActiveProvider] = React.useState<AuthProviderKey | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const hasLoadedInitialDevUser = React.useRef(false);

  const isProviderAvailable = React.useCallback((provider: AuthProviderKey) => {
    return DEV_MODE && Boolean(provider);
  }, []);

  React.useEffect(() => {
    if (!DEV_MODE || !user || hasLoadedInitialDevUser.current) {
      return;
    }

    hasLoadedInitialDevUser.current = true;

    loadCloudDataIntoLocalDatabase(user).catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load cloud data.');
    });
  }, [user]);

  const signIn = React.useCallback(async (provider: AuthProviderKey) => {
    setStatus('signing-in');
    setActiveProvider(provider);
    setErrorMessage(null);

    try {
      if (!DEV_MODE) {
        throw new Error('Sign-in clients are not configured yet.');
      }

      const nextUser = createAuthUser(createDevIdentity(provider));
      setUser(nextUser);
      await loadCloudDataIntoLocalDatabase(nextUser);

      return nextUser;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sign in.');
      return null;
    } finally {
      setStatus('idle');
      setActiveProvider(null);
    }
  }, []);

  const signOut = React.useCallback(async () => {
    if (!user) {
      return;
    }

    setStatus('signing-out');
    setErrorMessage(null);

    try {
      await deloadCloudDataFromLocalDatabase(user);
      setUser(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to log out.');
    } finally {
      setStatus('idle');
    }
  }, [user]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      activeProvider,
      errorMessage,
      isProviderAvailable,
      signIn,
      signOut,
      clearAuthError: () => setErrorMessage(null),
    }),
    [activeProvider, errorMessage, isProviderAvailable, signIn, signOut, status, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function createDevIdentity(provider: AuthProviderKey): ExternalAuthIdentity {
  return {
    id: devUserId,
    provider,
    email: devUserEmail,
    givenName: 'Dev',
    familyName: 'Traveler',
  };
}

function createAuthUser(identity: ExternalAuthIdentity): AuthUser {
  const displayName = createAnonymousDisplayName(`${identity.provider}:${identity.id}`);

  return {
    ...identity,
    displayName,
    initials: createInitials(displayName),
  };
}

export function useAuth() {
  const value = React.use(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return value;
}
