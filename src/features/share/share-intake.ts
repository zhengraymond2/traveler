import type { AddSourceInput } from '@/services/contracts';

export type SharedPayloadClassification = 'instagram' | 'google-maps' | 'text' | 'image' | 'file' | 'unknown';

export type SharePayloadLike = {
  contentType?: string | null;
  contentUri?: string | null;
  mimeType?: string | null;
  shareType?: string | null;
  value?: string | null;
};

export type ShareIntakeLog<Payload, ResolvedPayload> = {
  classifications: SharedPayloadClassification[];
  payloads: Payload[];
  receivedAt: string;
  resolvedPayloads: ResolvedPayload[];
  source: 'expo-sharing';
};

export type ExpoSharingModule = {
  clearSharedPayloads: () => void;
  useIncomingShare: () => {
    isResolving: boolean;
    resolvedSharedPayloads: SharePayloadLike[];
    sharedPayloads: SharePayloadLike[];
  };
};

declare const require: (moduleName: string) => unknown;

export function classifySharedPayload(payload: SharePayloadLike): SharedPayloadClassification {
  const searchableText = [payload.value, payload.contentUri].filter(Boolean).join(' ').toLowerCase();

  if (searchableText.includes('instagram.com')) {
    return 'instagram';
  }

  if (
    searchableText.includes('google.com/maps') ||
    searchableText.includes('maps.app.goo.gl') ||
    searchableText.includes('goo.gl/maps') ||
    searchableText.includes('maps.google.')
  ) {
    return 'google-maps';
  }

  const shareKind = payload.shareType ?? payload.contentType;
  if (shareKind === 'text' || shareKind === 'url') {
    return 'text';
  }
  if (shareKind === 'image') {
    return 'image';
  }
  if (shareKind === 'file') {
    return 'file';
  }

  return 'unknown';
}

export function buildShareIntakeLog<Payload extends SharePayloadLike, ResolvedPayload extends SharePayloadLike>(
  payloads: Payload[],
  resolvedPayloads: ResolvedPayload[]
): ShareIntakeLog<Payload, ResolvedPayload> {
  const payloadsToClassify = resolvedPayloads.length ? resolvedPayloads : payloads;

  return {
    classifications: payloadsToClassify.map(classifySharedPayload),
    payloads,
    receivedAt: new Date().toISOString(),
    resolvedPayloads,
    source: 'expo-sharing',
  };
}

export function loadExpoSharingModule(
  loadModule: () => unknown = () => require('expo-sharing')
): ExpoSharingModule | null {
  try {
    return loadModule() as ExpoSharingModule;
  } catch (error) {
    if (isMissingExpoSharingNativeModule(error)) {
      return null;
    }

    throw error;
  }
}

function isMissingExpoSharingNativeModule(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Cannot find native module 'ExpoSharing'") || message.includes('Cannot find native module ExpoSharing');
}

export function buildAddSourceInputsFromSharedPayloads(payloads: SharePayloadLike[]): AddSourceInput[] {
  return payloads
    .map((payload) => buildAddSourceInputFromSharedPayload(payload))
    .filter((input): input is AddSourceInput => input !== null);
}

function buildAddSourceInputFromSharedPayload(payload: SharePayloadLike): AddSourceInput | null {
  const value = getPayloadValue(payload);
  if (!value) {
    return null;
  }

  switch (classifySharedPayload(payload)) {
    case 'instagram':
      return { instagramUrls: [value] };
    case 'google-maps':
      return { googleMapsUrl: value };
    case 'image':
      return { sourcePhotoUris: [value] };
    case 'text':
      return { textCaption: value };
    default:
      return null;
  }
}

function getPayloadValue(payload: SharePayloadLike) {
  return payload.value?.trim() || payload.contentUri?.trim() || null;
}
