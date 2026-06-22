export function canonicalizeInstagramUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (!isInstagramHost(url.hostname)) {
      return null;
    }

    const path = normalizePath(url.pathname);
    if (!path) {
      return null;
    }

    return `https://www.instagram.com${path}`;
  } catch {
    return null;
  }
}

export function canonicalizeInstagramUrls(values: string[] | null | undefined): string[] {
  return Array.from(
    new Set(
      (values ?? [])
        .map((value) => canonicalizeInstagramUrl(value))
        .filter((value): value is string => Boolean(value))
    )
  );
}

function isInstagramHost(hostname: string) {
  const normalized = hostname.toLowerCase();
  return normalized === 'instagram.com' || normalized === 'www.instagram.com' || normalized === 'm.instagram.com';
}

function normalizePath(pathname: string) {
  const collapsed = pathname.replace(/\/+/g, '/');
  const withoutTrailing = collapsed.replace(/\/$/, '');
  return withoutTrailing ? `${withoutTrailing}/` : null;
}
