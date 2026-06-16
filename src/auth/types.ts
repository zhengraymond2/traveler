export type AuthProviderKey = 'google' | 'facebook' | 'apple';

export type ExternalAuthIdentity = {
  id: string;
  provider: AuthProviderKey;
  email?: string | null;
  givenName?: string | null;
  familyName?: string | null;
};

export type AuthUser = ExternalAuthIdentity & {
  displayName: string;
  initials: string;
};

export type AuthProviderHandler = {
  signIn: () => Promise<ExternalAuthIdentity>;
  signOut: () => Promise<void>;
};

export class AuthCancelledError extends Error {
  constructor() {
    super('Sign in was cancelled.');
    this.name = 'AuthCancelledError';
  }
}
