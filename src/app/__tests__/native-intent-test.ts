import { redirectSystemPath } from '../+native-intent';

describe('native intent redirect', () => {
  test('redirects Expo sharing intents to the share handler', async () => {
    await expect(redirectSystemPath({ initial: true, path: 'traveler://expo-sharing?payload=1' })).resolves.toBe(
      '/handle-share'
    );
  });

  test('passes non-share paths through unchanged', async () => {
    await expect(redirectSystemPath({ initial: true, path: '/profile' })).resolves.toBe('/profile');
  });

  test('falls back to root for malformed paths', async () => {
    await expect(redirectSystemPath({ initial: true, path: '::::' })).resolves.toBe('/');
  });
});
