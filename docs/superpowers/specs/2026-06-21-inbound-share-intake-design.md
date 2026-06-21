# Inbound Share Intake Design

## Summary

Allow users to share content directly from other apps into Traveler. For this stub phase, Traveler only accepts the inbound share, classifies the payload source/content type, and prints all shared information to the console.

## Requirements

- Use Expo SDK 56 APIs and docs.
- Use `expo-sharing` for inbound share support.
- Support Expo Router inbound share redirection through `+native-intent.ts`.
- Enable native share targets for iOS and Android in `app.json`.
- Classify shared payloads as Instagram, Google Maps, text, image, file, or unknown.
- Stub actual processing by logging all shared payload information to `console.log`.
- Do not persist locations, photos, text, or links yet.

## UX

When another app shares compatible content to Traveler, the OS launches Traveler and routes to an internal `handle-share` screen. The screen shows a simple processing state while Expo resolves incoming share payloads, then returns the user to the saved places tab after logging.

No user-facing import confirmation is required in this stub phase. Console output is the source of truth for debugging.

## Architecture

Add `expo-sharing` and configure its app config plugin:

- iOS share extension enabled, accepting text, URLs, and images.
- Android share intent handling enabled, accepting text, images, and generic files for single and multiple shares.

Add `src/app/+native-intent.ts` so Expo Router redirects URLs with host `expo-sharing` to `/handle-share`.

Add `src/app/handle-share.tsx` as a route that uses `useIncomingShare()` from `expo-sharing`. Once resolving completes, the route classifies both raw and resolved payloads, logs a single structured object, clears the shared payloads, and redirects to `/(tabs)/saved`.

Add pure helpers in `src/features/share/share-intake.ts` for classification and logging payload shape. The route calls these helpers so classification is testable without native share UI.

## Classification

- Instagram: any shared value, URL, content URI, or resolved URI contains `instagram.com`.
- Google Maps: any shared value, URL, content URI, or resolved URI contains `google.com/maps`, `maps.app.goo.gl`, `goo.gl/maps`, or `maps.google.`.
- Text: `shareType` or `contentType` is `text` or `url`, and it is not Instagram or Google Maps.
- Image: `shareType` or `contentType` is `image`.
- File: `shareType` is `file` or `contentType` is `file`.
- Unknown: anything not matched above.

## Testing

Add unit tests for:

- Share intent redirection from `expo-sharing` to `/handle-share`.
- Non-share deep links passing through unchanged.
- Classification of Instagram links.
- Classification of Google Maps links.
- Classification of generic text.
- Classification of image/file payloads.
- Building a console-ready log object that preserves raw and resolved payload details.

Native OS share-sheet behavior is not tested in Jest.
