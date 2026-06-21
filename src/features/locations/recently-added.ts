export type RecentlyAddedCandidate = {
  addedAt?: Date | string | number | null;
  createdAt?: Date | string | number | null;
  id: string;
  localStatus?: string | null;
  status?: string | null;
};

const recentlyAddedWindowMs = 60 * 60 * 1000;

export function getRecentlyAddedLocations<Location extends RecentlyAddedCandidate>(
  now: Date,
  locations: Location[]
): Location[] {
  const nowTime = now.getTime();

  return locations
    .filter((location) => {
      const addedAt = getAddedAtTime(location);
      return addedAt != null && nowTime - addedAt <= recentlyAddedWindowMs && nowTime >= addedAt;
    })
    .sort((first, second) => (getAddedAtTime(second) ?? 0) - (getAddedAtTime(first) ?? 0));
}

export function isProcessingLocation(location: unknown) {
  if (!location || typeof location !== 'object') {
    return false;
  }

  const candidate = location as Pick<RecentlyAddedCandidate, 'localStatus' | 'status'>;
  return candidate.localStatus === 'processing' || candidate.status === 'processing';
}

function getAddedAtTime(location: RecentlyAddedCandidate) {
  return toTime(location.addedAt ?? location.createdAt);
}

function toTime(value: Date | string | number | null | undefined) {
  if (value == null) {
    return null;
  }
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}
