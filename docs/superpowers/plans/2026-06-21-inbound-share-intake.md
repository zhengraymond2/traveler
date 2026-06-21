# Inbound Share Intake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow other apps to share content into Traveler and stub processing by logging classified share payloads.

**Architecture:** Configure `expo-sharing` for native inbound shares, route Expo Router share intents through `+native-intent.ts`, and handle payloads on a `handle-share` route. Keep classification in pure helper functions so Jest can verify behavior without native share UI.

**Tech Stack:** Expo SDK 56, Expo Router, `expo-sharing`, React Native, Jest, TypeScript.

## Global Constraints

- Use Expo SDK 56 APIs and docs.
- Use `expo-sharing` for inbound share support.
- Support Expo Router inbound share redirection through `+native-intent.ts`.
- Enable native share targets for iOS and Android in `app.json`.
- Classify shared payloads as Instagram, Google Maps, text, image, file, or unknown.
- Stub actual processing by logging all shared payload information to `console.log`.
- Do not persist locations, photos, text, or links yet.

---

### Task 1: Share Classification Helpers

**Files:**
- Create: `src/features/share/share-intake.ts`
- Create: `src/features/share/__tests__/share-intake-test.ts`

**Interfaces:**
- Produces: `classifySharedPayload(payload): SharedPayloadClassification`
- Produces: `buildShareIntakeLog(payloads, resolvedPayloads): ShareIntakeLog`

- [ ] Write failing tests for Instagram, Google Maps, generic text, image, file, and log object preservation.
- [ ] Run `npm test -- --runTestsByPath src/features/share/__tests__/share-intake-test.ts --runInBand` and verify failure.
- [ ] Implement the helper functions.
- [ ] Rerun the focused test and verify pass.

### Task 2: Native Intent Redirect

**Files:**
- Create: `src/app/+native-intent.ts`
- Create: `src/app/__tests__/native-intent-test.ts`

**Interfaces:**
- Produces: `redirectSystemPath({ path, initial }): Promise<string>`

- [ ] Write failing tests that redirect `traveler://expo-sharing?...` to `/handle-share` and pass non-share links through.
- [ ] Run `npm test -- --runTestsByPath src/app/__tests__/native-intent-test.ts --runInBand` and verify failure.
- [ ] Implement the Expo Router native-intent redirect.
- [ ] Rerun the focused test and verify pass.

### Task 3: Share Handler Route And Native Config

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `app.json`
- Create: `src/app/handle-share.tsx`

**Interfaces:**
- Consumes: `useIncomingShare`, `clearSharedPayloads` from `expo-sharing`.
- Consumes: `buildShareIntakeLog(payloads, resolvedPayloads)`.

- [ ] Install `expo-sharing@~56.0.18`.
- [ ] Configure the `expo-sharing` plugin in `app.json` for iOS and Android inbound shares.
- [ ] Implement `handle-share.tsx` to log `{ source: 'expo-sharing', ... }`, clear payloads, and `router.replace('/(tabs)/saved')`.
- [ ] Run `npm test -- --runInBand`, `npm run lint`, and `npx tsc --noEmit`.
