export type DetailEventMapsInput = {
  addressText: string | null | undefined;
  googleMapsUrl: string | null | undefined;
  savedLocation:
    | {
        googleMapsUrl: string | null | undefined;
        name: string | null | undefined;
      }
    | null
    | undefined;
};

export function getDetailEventMapsUrl(input: DetailEventMapsInput) {
  const savedLocationUrl = normalizeText(input.savedLocation?.googleMapsUrl);
  if (savedLocationUrl) {
    return savedLocationUrl;
  }

  const savedLocationName = normalizeText(input.savedLocation?.name);
  if (savedLocationName) {
    return getGoogleMapsSearchUrl(savedLocationName);
  }

  const directMapsUrl = normalizeText(input.googleMapsUrl);
  if (directMapsUrl) {
    return directMapsUrl;
  }

  const addressText = normalizeText(input.addressText);
  if (addressText) {
    return getGoogleMapsSearchUrl(addressText);
  }

  return null;
}

export function getGoogleMapsSearchUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function normalizeText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
