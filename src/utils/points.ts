type NumericLike = number | string | null | undefined;

const toNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

const parseDurationSeconds = (value: unknown): number | undefined => {
  if (value === null || value === undefined) return undefined;

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    if (trimmed.includes(':')) {
      const parts = trimmed.split(':').map((part) => Number(part));
      if (parts.some((part) => !Number.isFinite(part))) return undefined;

      const [h = 0, m = 0, s = 0] = parts;
      return h * 3600 + m * 60 + s;
    }

    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : undefined;
  }

  return undefined;
};

export type ActivityPointSource = {
  points?: NumericLike;
  point_value?: NumericLike;
  score?: NumericLike;
  duration_sec?: NumericLike;
  duration?: NumericLike;
};

export function computeActivityPoints(
  source: ActivityPointSource | undefined,
  durationOverride?: NumericLike,
): number {
  if (!source && durationOverride == null) return 0;

  const directSources: NumericLike[] = [
    source?.points,
    source?.point_value,
    source?.score,
  ];

  for (const val of directSources) {
    const num = toNumber(val);
    if (num !== undefined) {
      return Math.max(0, Math.round(num));
    }
  }

  const sec =
    toNumber(durationOverride) ??
    toNumber(source?.duration_sec) ??
    parseDurationSeconds(source?.duration);

  if (sec === undefined) return 0;
  return Math.max(0, Math.round(sec / 60));
}

export function sumActivityPoints(list: ActivityPointSource[] | undefined | null): number {
  if (!Array.isArray(list) || list.length === 0) return 0;
  return list.reduce((total, item) => total + computeActivityPoints(item), 0);
}

