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
  distance_km?: NumericLike;
  step_total?: NumericLike;
  type?: string | null;
  activity?: string | null;
};

const WALK_MIN_SPEED = 3; // km/h
const WALK_MAX_SPEED = 15;
const WALK_MIN_STEP_PER_SEC = 0.2;
const WALK_MAX_STEP_PER_MIN = 200;
const CYCLE_MIN_SPEED = 3;
const CYCLE_MAX_SPEED = 30;

export type PointEvaluation = {
  points: number;
  valid: boolean;
  reason?: string;
};

export function evaluateActivityPoints(
  source: ActivityPointSource | undefined,
  durationOverride?: NumericLike,
): PointEvaluation {
  if (!source && durationOverride == null) return { points: 0, valid: true };

  const directSources: NumericLike[] = [
    source?.points,
    source?.point_value,
    source?.score,
  ];

  const sec =
    toNumber(durationOverride) ??
    toNumber(source?.duration_sec) ??
    parseDurationSeconds(source?.duration);
  const distance = toNumber(source?.distance_km);
  const steps = toNumber(source?.step_total);
  const typeRaw = String(
    (source?.type ?? source?.activity ?? '') || '',
  ).toLowerCase();

  let valid = true;
  let reason: string | undefined;

  const evaluateWalking = () => {
    let localValid = true;
    if (!sec || sec <= 0) {
      localValid = false;
      reason = 'no-duration';
    }
    if (localValid && (distance === undefined || distance < 0)) {
      localValid = false;
      reason = 'no-distance';
    }
    if (localValid && distance !== undefined && sec && sec > 0) {
      const speed = distance / (sec / 3600);
      if (speed < WALK_MIN_SPEED || speed > WALK_MAX_SPEED) {
        localValid = false;
        reason = 'speed-out-of-range';
      }
    }
    if (localValid) {
      if (steps === undefined || steps < 0) {
        localValid = false;
        reason = 'no-steps';
      } else if (sec && sec > 0) {
        const stepsPerSec = steps / sec;
        const stepsPerMin = stepsPerSec * 60;
        if (
          stepsPerSec < WALK_MIN_STEP_PER_SEC ||
          stepsPerMin > WALK_MAX_STEP_PER_MIN
        ) {
          localValid = false;
          reason = 'step-rate-out-of-range';
        }
      }
    }
    return localValid;
  };

  const evaluateCycling = () => {
    if (!sec || sec <= 0 || distance === undefined || distance < 0) {
      reason = 'missing-data';
      return false;
    }
    const speed = distance / (sec / 3600);
    if (speed < CYCLE_MIN_SPEED || speed > CYCLE_MAX_SPEED) {
      reason = 'speed-out-of-range';
      return false;
    }
    return true;
  };

  if (typeRaw.includes('walk')) {
    valid = evaluateWalking();
  } else if (typeRaw.includes('cycl')) {
    valid = evaluateCycling();
  }

  let points: number | undefined;
  for (const val of directSources) {
    const num = toNumber(val);
    if (num !== undefined) {
      points = Math.max(0, Math.round(num));
      break;
    }
  }

  if (points === undefined) {
    if (sec === undefined || sec <= 0) {
      points = 0;
    } else {
      points = Math.max(0, Math.round(sec / 60));
    }
  }

  if (!valid) points = 0;
  return { points, valid, reason };
}

export function computeActivityPoints(
  source: ActivityPointSource | undefined,
  durationOverride?: NumericLike,
): number {
  const result = evaluateActivityPoints(source, durationOverride);
  return result.points;
}

export function sumActivityPoints(list: ActivityPointSource[] | undefined | null): number {
  if (!Array.isArray(list) || list.length === 0) return 0;
  return list.reduce((total, item) => total + computeActivityPoints(item), 0);
}
