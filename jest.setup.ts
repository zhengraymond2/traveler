jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('expo-font', () => ({
  isLoaded: jest.fn(() => true),
  loadAsync: jest.fn(() => Promise.resolve()),
}));
