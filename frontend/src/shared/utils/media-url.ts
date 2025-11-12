const MEDIA_PLACEHOLDER = '/api/placeholder/400/300';

const isAbsoluteUrl = (value: string): boolean => {
  const lower = value.toLowerCase();
  return (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('blob:') ||
    lower.startsWith('data:')
  );
};

const isMediaPlaceholder = (value: string): boolean =>
  value.startsWith('/api/placeholder');

const normalizeMediaPath = (value: string): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (isMediaPlaceholder(trimmed)) {
    return trimmed;
  }

  if (isAbsoluteUrl(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('/api/media/')) {
    return trimmed;
  }

  const withoutLeadingSlash = trimmed.replace(/^\/+/, '');

  if (withoutLeadingSlash.startsWith('api/media/')) {
    return `/${withoutLeadingSlash}`;
  }

  const withoutMediaPrefix = withoutLeadingSlash.startsWith('media/')
    ? withoutLeadingSlash.slice('media/'.length)
    : withoutLeadingSlash;

  return `/api/media/${withoutMediaPrefix}`;
};

const extractImageCandidate = (image: unknown): string | null => {
  if (!image || typeof image !== 'object') {
    return null;
  }

  const record = image as Record<string, unknown>;
  const candidate =
    record.image_url ??
    record.image_display_url ??
    record.url ??
    record.image;

  return typeof candidate === 'string' ? candidate : null;
};

export const resolveMediaUrl = (value: unknown): string | null => {
  if (typeof value === 'string') {
    return normalizeMediaPath(value);
  }

  return null;
};

export const resolveAdImageUrl = (
  images: unknown,
  fallback: string = MEDIA_PLACEHOLDER
): string => {
  if (!images) {
    return fallback;
  }

  if (typeof images === 'string') {
    return normalizeMediaPath(images) ?? fallback;
  }

  if (Array.isArray(images)) {
    for (const image of images) {
      const candidate = extractImageCandidate(image);
      const resolved = normalizeMediaPath(candidate ?? '');
      if (resolved) {
        return resolved;
      }
    }

    return fallback;
  }

  const candidate = extractImageCandidate(images);
  return normalizeMediaPath(candidate ?? '') ?? fallback;
};

export { MEDIA_PLACEHOLDER };
