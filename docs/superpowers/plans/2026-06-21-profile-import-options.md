# Profile Import Options Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two stubbed import actions to the signed-in Profile screen: native multi-image selection and Instagram JSON document selection.

**Architecture:** Keep the UI and transient status/error state in `src/app/(tabs)/profile.tsx`. Mock the native picker modules in a focused Profile screen test so no test depends on real iOS picker UI.

**Tech Stack:** Expo SDK 56, React Native, Expo Router, React Native Paper, `expo-image-picker`, `expo-document-picker`, Jest, `@testing-library/react-native`.

## Global Constraints

- Use Expo SDK 56 APIs and docs.
- Use `expo-image-picker` for image selection.
- Use `expo-document-picker` for JSON file selection.
- Keep import actions under the existing signed-in Profile settings surface.
- Keep the current `Export Data` row unchanged.
- Stub successful actions with an in-app status message.
- Treat canceled picker flows as no-op.
- Show an in-app error if photo library permission is denied.

---

### Task 1: Add Picker Dependency And Profile Import Tests

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/app/(tabs)/__tests__/profile-test.tsx`

**Interfaces:**
- Consumes: `ProfileScreen` default export from `src/app/(tabs)/profile.tsx`.
- Produces: tests that require `ProfileScreen` to render `Import data`, `Batch upload images`, and `Import Instagram JSON`, and to call native picker APIs with documented options.

- [ ] **Step 1: Install `expo-document-picker`**

Run: `npm install expo-document-picker@~56.0.4`

Expected: `package.json` and `package-lock.json` include `expo-document-picker`.

- [ ] **Step 2: Write the failing Profile tests**

Create `src/app/(tabs)/__tests__/profile-test.tsx` with tests that:

```tsx
import { fireEvent, waitFor } from '@testing-library/react-native';

import ProfileScreen from '../profile';
import { UITestHelper } from '@/test/UITestHelper';

const mockUseAuth = jest.fn();
const mockRouterPush = jest.fn();
const mockRequestMediaLibraryPermissionsAsync = jest.fn();
const mockLaunchImageLibraryAsync = jest.fn();
const mockGetDocumentAsync = jest.fn();

jest.mock('@/auth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockRouterPush(...args),
  },
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: (...args: unknown[]) => mockRequestMediaLibraryPermissionsAsync(...args),
  launchImageLibraryAsync: (...args: unknown[]) => mockLaunchImageLibraryAsync(...args),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: (...args: unknown[]) => mockGetDocumentAsync(...args),
}));

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      status: 'signed-in',
      user: { displayName: 'Sofia Zheng' },
      signOut: jest.fn(),
    });
  });

  test('shows signed-in import actions', () => {
    const screen = UITestHelper.renderWithPaper(<ProfileScreen />);

    expect(screen.getByText('Import data')).toBeTruthy();
    expect(screen.getByText('Batch upload images')).toBeTruthy();
    expect(screen.getByText('Import Instagram JSON')).toBeTruthy();
  });

  test('opens the native image picker for batch image upload', async () => {
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///one.jpg' }, { uri: 'file:///two.jpg' }],
    });
    const screen = UITestHelper.renderWithPaper(<ProfileScreen />);

    fireEvent.press(screen.getByText('Batch upload images'));

    await waitFor(() => {
      expect(mockLaunchImageLibraryAsync).toHaveBeenCalledWith({
        allowsMultipleSelection: true,
        mediaTypes: ['images'],
        orderedSelection: true,
        quality: 0.9,
        selectionLimit: 0,
      });
    });
    expect(await screen.findByText('Selected 2 images for import.')).toBeTruthy();
  });

  test('shows an error when image permissions are denied', async () => {
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: false });
    const screen = UITestHelper.renderWithPaper(<ProfileScreen />);

    fireEvent.press(screen.getByText('Batch upload images'));

    expect(await screen.findByText('Photo library permission is required to import images.')).toBeTruthy();
    expect(mockLaunchImageLibraryAsync).not.toHaveBeenCalled();
  });

  test('opens the document picker for Instagram JSON import', async () => {
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ name: 'instagram-data.json', uri: 'file:///instagram-data.json' }],
    });
    const screen = UITestHelper.renderWithPaper(<ProfileScreen />);

    fireEvent.press(screen.getByText('Import Instagram JSON'));

    await waitFor(() => {
      expect(mockGetDocumentAsync).toHaveBeenCalledWith({
        copyToCacheDirectory: true,
        multiple: false,
        type: ['application/json', 'text/json'],
      });
    });
    expect(await screen.findByText('Selected instagram-data.json for Instagram import.')).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run the Profile tests to verify they fail**

Run: `npm test -- src/app/(tabs)/__tests__/profile-test.tsx --runInBand`

Expected: FAIL because the new import UI and `expo-document-picker` integration do not exist yet.

### Task 2: Implement Profile Import Actions

**Files:**
- Modify: `src/app/(tabs)/profile.tsx`
- Test: `src/app/(tabs)/__tests__/profile-test.tsx`

**Interfaces:**
- Consumes: `expo-image-picker.requestMediaLibraryPermissionsAsync`, `expo-image-picker.launchImageLibraryAsync`, `expo-document-picker.getDocumentAsync`.
- Produces: `ProfileScreen` handlers `handleBatchUploadImages` and `handleImportInstagramJson` that show stub snackbar messages.

- [ ] **Step 1: Add picker imports and snackbar state**

Modify `src/app/(tabs)/profile.tsx` to import `expo-document-picker`, `expo-image-picker`, and `Snackbar`; add `errorMessage` and `snackbarMessage` React state inside `ProfileScreen`.

- [ ] **Step 2: Implement `handleBatchUploadImages`**

Add an async handler that requests media library permission, no-ops on denied or canceled selection, launches `ImagePicker.launchImageLibraryAsync()` with the documented multi-image options, and sets `Selected ${count} image(s) for import.` on success.

- [ ] **Step 3: Implement `handleImportInstagramJson`**

Add an async handler that launches `DocumentPicker.getDocumentAsync()` with JSON options, no-ops on cancel, and sets `Selected ${name} for Instagram import.` on success.

- [ ] **Step 4: Replace the stub Import Data row**

Replace the single `Import Data` list item with a visible `Import data` heading and two pressable `List.Item` rows wired to the handlers.

- [ ] **Step 5: Render snackbar/error feedback**

Render profile-level error text near the signed-in settings surface and a `Snackbar` at the bottom of the screen for successful stub messages.

- [ ] **Step 6: Run focused tests**

Run: `npm test -- src/app/(tabs)/__tests__/profile-test.tsx --runInBand`

Expected: PASS.

- [ ] **Step 7: Run broader verification**

Run: `npm test -- --runInBand`

Expected: PASS.
