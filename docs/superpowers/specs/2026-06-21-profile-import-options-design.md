# Profile Import Options Design

## Summary

Add two stubbed import actions under the signed-in Profile screen's import area:

- Batch upload images with the native system photo selector.
- Import an Instagram data export JSON file with the native system document picker.

The feature is intentionally a UI and picker integration only. It does not persist imported images, parse Instagram JSON, or create saved locations yet.

## Requirements

- Use Expo SDK 56 APIs and docs.
- Use `expo-image-picker` for image selection.
- Use `expo-document-picker` for JSON file selection.
- Keep import actions under the existing signed-in Profile settings surface.
- Keep the current `Export Data` row unchanged.
- Stub successful actions with an in-app status message.
- Treat canceled picker flows as no-op.
- Show an in-app error if photo library permission is denied.

## UX

In the signed-in Profile screen, replace the single stubbed `Import Data` row with an `Import data` subsection that contains two list actions.

`Batch upload images` opens the native photo library selector. The selector allows multiple images, keeps iOS selection order when supported, and has no app-defined maximum selection limit. After a successful selection, the app shows a snackbar such as `Selected 3 images for import.`.

`Import Instagram JSON` opens the native document picker restricted to JSON file types. After a successful selection, the app shows a snackbar such as `Selected instagram-data.json for Instagram import.`.

## Architecture

The implementation stays in `src/app/(tabs)/profile.tsx` because the actions are stubbed and local to the Profile screen. The screen owns transient snackbar/error state and picker handlers.

The image action calls `ImagePicker.requestMediaLibraryPermissionsAsync()` before opening `ImagePicker.launchImageLibraryAsync()` with:

- `allowsMultipleSelection: true`
- `mediaTypes: ['images']`
- `orderedSelection: true`
- `quality: 0.9`
- `selectionLimit: 0`

The Instagram action calls `DocumentPicker.getDocumentAsync()` with:

- `copyToCacheDirectory: true`
- `multiple: false`
- `type: ['application/json', 'text/json']`

## Error Handling

If the user cancels either picker, no snackbar or error appears.

If photo library permission is denied, show `Photo library permission is required to import images.`.

If either native picker throws, show a generic failure message specific to the action.

## Testing

Add a focused Profile screen test that renders a signed-in user and verifies:

- The `Import data` heading is visible.
- The two new import rows are visible.
- Pressing `Batch upload images` requests photo permissions and launches the image picker with multiple image selection options.
- A successful image selection shows the expected stub snackbar message.
- Pressing `Import Instagram JSON` launches the document picker with JSON options.
- A successful JSON selection shows the expected stub snackbar message.

The tests should mock auth and native picker modules. They should not depend on real iOS picker UI.
