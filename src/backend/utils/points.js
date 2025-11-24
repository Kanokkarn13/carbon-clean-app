/**
 * Backend copy of the points rules used in the app.
 * We keep the same speed/step guards to avoid inflating points.
 */
const WALK_MIN_SPEED = 3; // km/h
const WALK_MAX_SPEED = 15;
const WALK_MIN_STEP_PER_SEC = 0.2;
const WALK_MAX_STEP_PER_MIN = 200;
const CYCLE_MIN_SPEED = 3;
const CYCLE_MAX_SPEED = 30;

const toNumber = (v) => {
  if (v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Evaluate and return points for an activity; if invalid, returns 0.
 * @param {{ type?: string, activity?: string, distance_km?: any, step_total?: any, duration_sec?: any, duration?: any, points?: any, point_value?: any, score?: any }} source
 * @param {any} durationOverride
 */
function evaluateActivityPoints(source = {}, durationOverride) {
  const directSources = [source.points, source.point_value, source.score];
  let points;
  for (const val of directSources) {
    const num = toNumber(val);
    if (num !== undefined) {
      points = Math.max(0, Math.round(num));
      break;
    }
  }

  const sec =
    toNumber(durationOverride) ??
    toNumber(source.duration_sec) ??
    toNumber(source.duration);
  const distance = toNumber(source.distance_km);
  const steps = toNumber(source.step_total);
  const typeRaw = String(source.type ?? source.activity ?? '').toLowerCase();

  let valid = true;

  const evaluateWalking = () => {
    if (!sec || sec <= 0) return false;
    if (distance === undefined || distance < 0) return false;
    const speed = distance / (sec / 3600);
    if (speed < WALK_MIN_SPEED || speed > WALK_MAX_SPEED) return false;
    if (steps === undefined || steps < 0) return false;
    const stepsPerSec = steps / sec;
    const stepsPerMin = stepsPerSec * 60;
    return !(
      stepsPerSec < WALK_MIN_STEP_PER_SEC || stepsPerMin > WALK_MAX_STEP_PER_MIN
    );
  };

  const evaluateCycling = () => {
    if (!sec || sec <= 0 || distance === undefined || distance < 0) return false;
    const speed = distance / (sec / 3600);
    return !(speed < CYCLE_MIN_SPEED || speed > CYCLE_MAX_SPEED);
  };

  if (typeRaw.includes('walk')) {
    valid = evaluateWalking();
  } else if (typeRaw.includes('cycl')) {
    valid = evaluateCycling();
  }

  if (points === undefined) {
    if (!sec || sec <= 0) points = 0;
    else points = Math.max(0, Math.round(sec / 60)); // 1 point per minute
  }

  if (!valid) points = 0;
  return points;
}

module.exports = {
  evaluateActivityPoints,
};
