import type { AuthProviderHandler, AuthProviderKey } from './types';

export const authProviderHandlers: Partial<Record<AuthProviderKey, AuthProviderHandler>> = {};
