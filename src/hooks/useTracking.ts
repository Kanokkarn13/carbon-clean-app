// hooks/useTracking.ts
import { useState, useEffect, useRef } from 'react';
import { Pedometer } from 'expo-sensors';
import * as Location from 'expo-location';
import { calculateDistance } from '../utils/distance';

/**
 * ================= Configuration =================
 */

// Caps / windows
const MAX_SPEED = 150;                 // km/h hard cap
const NO_MOVE_TIMEOUT_MS = 3000;       // force speed->0 if stale
const STATIONARY_SPEED_KMH = 0.8;
const STATIONARY_WINDOW = 8;           // samples for stationary judge
const STATIONARY_MOVE_SUM = 6;         // meters within window

// Indoor/outdoor heuristics
const BASE_MAX_ACCURACY = 50;          // m (outdoor target)
const INDOOR_MAX_ACCURACY = 80;        // m (indoor-relaxed)

// stride & step speed window
const STRIDE_M = 0.72;                 // TODO: read from user profile for best accuracy
const STEP_SPEED_WINDOW_SEC = 8;       // seconds

/**
 * ============== Helper types / utils ==============
 */
type StepPoint = { t: number; steps: number };

function isLikelyIndoor(accNow: number | undefined, recentStepGain: number): boolean {
  const acc = typeof accNow === 'number' ? accNow : 999;
  // Loose heuristic: poor accuracy or any step signals -> likely indoor/urban canyon
  return acc >= 50 || recentStepGain > 0;
}

function clampSpeed(kmh: number): number {
  if (!Number.isFinite(kmh) || kmh < 0) return 0;
  return Math.min(kmh, MAX_SPEED);
}

export const useTracking = () => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [speed, setSpeed] = useState<number>(0);      // km/h (smoothed)
  const [distance, setDistance] = useState<number>(0); // km (accumulated)
  const [time, setTime] = useState<number>(0);        // sec
  const [steps, setSteps] = useState<number>(0);
  const [isTracking, setIsTracking] = useState(false);
  const [subscription, setSubscription] = useState<Location.LocationSubscription | null>(null);
  const [updateCount, setUpdateCount] = useState(0);

  // Last fix (for timing/UI)
  const lastFixRef = useRef<Location.LocationObject | null>(null);
  const lastFixTsRef = useRef<number>(0);

  // Distance anchor (only moves when a hop is accepted)
  const distAnchorRef = useRef<Location.LocationObject | null>(null);

  // Speed smoothing (IIR)
  const lastSmoothedRef = useRef<number>(0);

  // Stationary detection buffers
  const moveHistory = useRef<number[]>([]);
  const speedHistoryWindow = useRef<number[]>([]);
  const isStationaryRef = useRef<boolean>(false);

  // Pedometer window (for speed & distance fallback)
  const prevStepsRef = useRef<number>(0);
  const stepWindowRef = useRef<StepPoint[]>([]);   // (t, stepDelta) over recent seconds
  const pedoSubRef = useRef<Pedometer.Subscription | null>(null);

  // Watchdog
  const lastMovementAtRef = useRef<number>(0);

  /**
   * Time tracking
   */
  useEffect(() => {
    let h: ReturnType<typeof setInterval> | null = null;
    if (isTracking) h = setInterval(() => setTime((p) => p + 1), 1000);
    return () => { if (h) clearInterval(h); };
  }, [isTracking]);

  /**
   * Pedometer subscription
   */
  useEffect(() => {
    const subscribe = async () => {
      const isAvailable = await Pedometer.isAvailableAsync();
      if (!isAvailable) return;

      pedoSubRef.current = Pedometer.watchStepCount((result) => {
        const now = Date.now();
        const delta = Math.max(0, result.steps - prevStepsRef.current);
        prevStepsRef.current = result.steps;

        if (delta > 0) {
          lastMovementAtRef.current = now;
          const arr = stepWindowRef.current;
          arr.push({ t: now, steps: delta });
          const cutoff = now - STEP_SPEED_WINDOW_SEC * 1000;
          while (arr.length && arr[0].t < cutoff) arr.shift();
        }

        setSteps(result.steps);
      });
    };

    if (isTracking) subscribe();
    return () => pedoSubRef.current?.remove();
  }, [isTracking]);

  /**
   * Speed from steps (rolling window)
   */
  const speedFromStepsKmh = (): number => {
    const arr = stepWindowRef.current;
    if (!arr.length) return 0;

    const now = Date.now();
    const cutoff = now - STEP_SPEED_WINDOW_SEC * 1000;
    const recent = arr.filter((x) => x.t >= cutoff);
    if (!recent.length) return 0;

    const totalSteps = recent.reduce((a, b) => a + b.steps, 0);
    const dtSec = Math.max(1, (now - recent[0].t) / 1000);
    const meters = totalSteps * STRIDE_M;
    return clampSpeed((meters / dtSec) * 3.6);
  };

  /**
   * Consecutive-fix speed fallback
   */
  const calculateSpeedFallback = (newLoc: Location.LocationObject, effMaxAcc: number): number => {
    if (!lastFixRef.current || lastFixTsRef.current === 0) return 0;

    const timeDiff = (newLoc.timestamp - lastFixTsRef.current) / 1000;
    if (timeDiff <= 0) return 0;

    const acc1 = newLoc.coords.accuracy ?? 999;
    const acc2 = lastFixRef.current.coords.accuracy ?? 999;
    if (acc1 > effMaxAcc || acc2 > effMaxAcc) return 0;

    const dist = calculateDistance(
      lastFixRef.current.coords.latitude,
      lastFixRef.current.coords.longitude,
      newLoc.coords.latitude,
      newLoc.coords.longitude
    ); // meters

    // A light gate: at least half the combined uncertainty
    const gate = Math.max(1, 0.5 * (acc1 + acc2));
    if (dist <= gate) return 0;

    const speedKmh = (dist / timeDiff) * 3.6;
    return clampSpeed(speedKmh);
  };

  /**
   * Stationary flag update
   */
  const updateStationaryFlag = (deltaMeters: number, currentSpeedKmh: number) => {
    moveHistory.current = [...moveHistory.current.slice(-STATIONARY_WINDOW + 1), Math.max(0, deltaMeters)];
    speedHistoryWindow.current = [
      ...speedHistoryWindow.current.slice(-STATIONARY_WINDOW + 1),
      Math.max(0, currentSpeedKmh || 0),
    ];

    const movedSum = moveHistory.current.reduce((a, b) => a + b, 0);
    const avgSpd =
      speedHistoryWindow.current.length
        ? speedHistoryWindow.current.reduce((a, b) => a + b, 0) / speedHistoryWindow.current.length
        : 0;

    isStationaryRef.current = movedSum < STATIONARY_MOVE_SUM && avgSpd < STATIONARY_SPEED_KMH;
  };

  /**
   * Core GPS handler — adaptive distance acceptance + single-source distance per tick
   */
  const handleLocationUpdate = (newLoc: Location.LocationObject) => {
    const now = Date.now();
    const accNow = newLoc.coords.accuracy ?? 999;

    // always advance "last fix" for timing
    lastFixRef.current = newLoc;
    lastFixTsRef.current = newLoc.timestamp;

    // recent steps window
    const recentStepGain = stepWindowRef.current.reduce((a, b) => a + b.steps, 0);
    const likelyIndoor = isLikelyIndoor(accNow, recentStepGain);
    const effMaxAcc = likelyIndoor ? INDOOR_MAX_ACCURACY : BASE_MAX_ACCURACY;

    // ===== Adaptive min-move threshold between consecutive accepted fixes =====
    const accPrev = distAnchorRef.current?.coords.accuracy ?? accNow;
    const adaptiveMinMove = Math.max(likelyIndoor ? 2.5 : 4, 0.5 * (accNow + accPrev)); // meters

    let deltaMeters = 0;

    if (!distAnchorRef.current) {
      distAnchorRef.current = newLoc;
    } else {
      const d = calculateDistance(
        distAnchorRef.current.coords.latitude,
        distAnchorRef.current.coords.longitude,
        newLoc.coords.latitude,
        newLoc.coords.longitude
      );

      // accept realistic hops only; ignore crazy teleports
      if (d >= adaptiveMinMove && d < 200) {
        deltaMeters = d;
        distAnchorRef.current = newLoc; // shift on every accepted hop
      }
    }

    // ===== Speed estimation (GPS first, then fallback) =====
    const gpsSpeedMs = newLoc.coords.speed;
    let spdKmh = clampSpeed(
      typeof gpsSpeedMs === 'number' && gpsSpeedMs > 0 ? gpsSpeedMs * 3.6 : 0
    );

    if (!spdKmh) spdKmh = calculateSpeedFallback(newLoc, effMaxAcc);

    const stepsKmh = speedFromStepsKmh();

    // Use step fallback IFF GPS accuracy is poor OR there was no accepted GPS movement/speed
    const useStepFallback = accNow > effMaxAcc || (!deltaMeters && !spdKmh);

    if (useStepFallback && stepsKmh > 0) {
      spdKmh = stepsKmh;

      // add step distance only when GPS did not contribute distance this tick
      if (!deltaMeters && recentStepGain > 0) {
        setDistance((prevKm) => prevKm + (recentStepGain * STRIDE_M) / 1000);
        stepWindowRef.current.length = 0; // avoid double count next tick
      }
    }

    // movement watchdog anchor
    if (deltaMeters > 0 || (spdKmh && spdKmh > STATIONARY_SPEED_KMH) || recentStepGain > 0) {
      lastMovementAtRef.current = now;
    }

    // stationary override
    updateStationaryFlag(deltaMeters, spdKmh || 0);
    if (isStationaryRef.current) {
      const stepsOnlyKmh = stepsKmh;
      if (stepsOnlyKmh <= STATIONARY_SPEED_KMH) {
        spdKmh = 0;
      } else {
        spdKmh = stepsOnlyKmh;
      }
    }

    // ===== Light IIR smoothing (snappy but stable) =====
    const ALPHA = 0.25; // 0..1 (higher = snappier)
    let smoothed = ALPHA * (spdKmh || 0) + (1 - ALPHA) * (lastSmoothedRef.current || 0);

    // decay to zero if nothing moved recently
    if (!lastMovementAtRef.current || now - lastMovementAtRef.current > NO_MOVE_TIMEOUT_MS) {
      smoothed = 0;
    }
    lastSmoothedRef.current = smoothed;

    // ===== Commit state in a single frame =====
    requestAnimationFrame(() => {
      setLocation(newLoc);
      setSpeed(Number(clampSpeed(smoothed).toFixed(1)));
      if (deltaMeters > 0) setDistance((prev) => prev + deltaMeters / 1000);
      setUpdateCount((p) => p + 1);
    });
  };

  /**
   * Start tracking
   */
  const startTracking = async () => {
    try {
      // reset states/buffers
      setDistance(0);
      setTime(0);
      setSteps(0);
      setUpdateCount(0);
      setSpeed(0);
      setLocation(null);

      lastSmoothedRef.current = 0;
      moveHistory.current = [];
      speedHistoryWindow.current = [];
      isStationaryRef.current = false;

      lastFixRef.current = null;
      lastFixTsRef.current = 0;
      distAnchorRef.current = null;

      prevStepsRef.current = 0;
      stepWindowRef.current = [];
      lastMovementAtRef.current = 0;

      // permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      // watch position
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Highest,
          distanceInterval: 1,       // tighter hops help outdoors
          timeInterval: 1000,        // 1s updates
          mayShowUserSettingsDialog: true,
          // @ts-ignore Expo supports this on Android; no-op on iOS
          foregroundService: { notificationTitle: 'Tracking in progress' },
        },
        handleLocationUpdate
      );

      setSubscription(sub);
      setIsTracking(true);
    } catch (err) {
      console.error('Tracking error:', err);
    }
  };

  /**
   * Stop tracking
   */
  const stopTracking = () => {
    subscription?.remove();
    pedoSubRef.current?.remove();
    setIsTracking(false);
    setSpeed(0);
    setLocation(null);
    setUpdateCount(0);

    lastSmoothedRef.current = 0;
    moveHistory.current = [];
    speedHistoryWindow.current = [];
    isStationaryRef.current = false;

    lastFixRef.current = null;
    lastFixTsRef.current = 0;
    distAnchorRef.current = null;

    prevStepsRef.current = 0;
    stepWindowRef.current = [];
    lastMovementAtRef.current = 0;
  };

  return {
    location,
    speed,
    distance,
    time,
    steps,
    isTracking,
    startTracking,
    stopTracking,
    subscription,
    updateCount,
  };
};
