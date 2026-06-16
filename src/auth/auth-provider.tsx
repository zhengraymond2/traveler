import * as React from 'react';

import { createAnonymousDisplayName, createInitials } from './anonymous-name';
import { deloadCloudDataFromLocalDatabase, loadCloudDataIntoLocalDatabase } from './cloud-sync';
import { authProviderHandlers } from './provider-handlers';
import { AuthCancelledError, type AuthProviderKey, type AuthUser } from './types';

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

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [status, setStatus] = React.useState<AuthStatus>('idle');
  const [activeProvider, setActiveProvider] = React.useState<AuthProviderKey | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const isProviderAvailable = React.useCallback((provider: AuthProviderKey) => {
    return Boolean(authProviderHandlers[provider]);
  }, []);

  const signIn = React.useCallback(async (provider: AuthProviderKey) => {
    const handler = authProviderHandlers[provider];
    if (!handler) {
      setErrorMessage('This sign-in method is not configured yet.');
      return null;
    }

    setStatus('signing-in');
    setActiveProvider(provider);
    setErrorMessage(null);

    try {
      const identity = await handler.signIn();
      const displayName = createAnonymousDisplayName(`${identity.provider}:${identity.id}`);
      const nextUser: AuthUser = {
        ...identity,
        displayName,
        initials: createInitials(displayName),
      };

      setUser(nextUser);
      await loadCloudDataIntoLocalDatabase(nextUser);

      return nextUser;
    } catch (error) {
      if (error instanceof AuthCancelledError) {
        setErrorMessage(null);
        return null;
      }

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
      await authProviderHandlers[user.provider]?.signOut();
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

export function useAuth() {
  const value = React.use(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return value;
}
