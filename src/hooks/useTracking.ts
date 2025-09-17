// hooks/useTracking.ts
import { useState, useEffect, useRef } from 'react';
import { Pedometer } from 'expo-sensors';
import * as Location from 'expo-location';
import { calculateDistance } from '../utils/distance';

/**
 * ================= Configuration =================
 */

// GPS base caps
const MAX_SPEED = 150;                 // km/h cap
const HISTORY_SIZE = 5;                // speed smoothing (moving average)

// GPS drift guards (outdoor-friendly)
const BASE_MAX_ACCURACY = 35;          // m
const BASE_MIN_MOVE_METERS = 5;        // m
const BASE_DRIFT_FACTOR = 1.5;         // * (acc_prev + acc_now)

// Indoor-relaxed thresholds
const INDOOR_MAX_ACCURACY = 80;        // m
const INDOOR_MIN_MOVE_METERS = 3;      // m
const INDOOR_DRIFT_FACTOR = 1.2;       // * (acc_prev + acc_now)

// Stationary detection
const STATIONARY_SPEED_KMH = 0.8;      // avg speed below this => stationary
const STATIONARY_WINDOW = 8;           // last N samples
const STATIONARY_MOVE_SUM = 6;         // total move (m) within window

// Step-based fallback (indoor-friendly)
const STRIDE_M = 0.72;                 // average step length in meters (tune per user)
const STEP_SPEED_WINDOW_SEC = 8;       // rolling window for step speed (seconds)

// Watchdog: if no movement for this long, force speed -> 0
const NO_MOVE_TIMEOUT_MS = 3000;

/**
 * ============== Helper types ==============
 */
type StepPoint = { t: number; steps: number };

/**
 * Coarse indoor heuristic:
 * - poor accuracy (>= 50m) OR
 * - we see step gains but GPS speed is flaky
 */
function isLikelyIndoor(accNow: number | undefined, recentStepGain: number): boolean {
  const acc = typeof accNow === 'number' ? accNow : 999;
  return acc >= 50 || recentStepGain > 0;
}

export const useTracking = () => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [speed, setSpeed] = useState<number>(0);
  const [distance, setDistance] = useState<number>(0); // km
  const [time, setTime] = useState<number>(0);
  const [steps, setSteps] = useState<number>(0);
  const [isTracking, setIsTracking] = useState(false);
  const [subscription, setSubscription] = useState<Location.LocationSubscription | null>(null);
  const [updateCount, setUpdateCount] = useState(0);

  const prevLocation = useRef<Location.LocationObject | null>(null);
  const prevTimestamp = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pedometerSubscription = useRef<Pedometer.Subscription | null>(null);

  // Speed smoothing (include zeros!)
  const speedHistory = useRef<number[]>([]);

  // Stationary detection buffers
  const moveHistory = useRef<number[]>([]);           // displacement (m)
  const speedHistoryWindow = useRef<number[]>([]);    // speed (km/h)
  const isStationaryRef = useRef<boolean>(false);

  // Step fallback buffers
  const prevStepsRef = useRef<number>(0);
  const stepWindowRef = useRef<StepPoint[]>([]);      // rolling window of (time, stepDelta)

  // Watchdog to force speed -> 0 if no movement
  const lastMovementAtRef = useRef<number>(0);

  /**
   * ============== Time tracking ==============
   */
  useEffect(() => {
    if (isTracking) {
      intervalRef.current = setInterval(() => setTime((p) => p + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isTracking]);

  /**
   * ============== Step tracking ==============
   */
  useEffect(() => {
    const subscribeToPedometer = async () => {
      const isAvailable = await Pedometer.isAvailableAsync();
      if (!isAvailable) return;

      pedometerSubscription.current = Pedometer.watchStepCount((result) => {
        const now = Date.now();
        const delta = Math.max(0, result.steps - prevStepsRef.current);
        prevStepsRef.current = result.steps;

        if (delta > 0) {
          // steps happened => update last-movement marker
          lastMovementAtRef.current = now;

          const arr = stepWindowRef.current;
          arr.push({ t: now, steps: delta });

          // Trim old entries beyond the window
          const cutoff = now - STEP_SPEED_WINDOW_SEC * 1000;
          while (arr.length && arr[0].t < cutoff) arr.shift();
        }

        setSteps(result.steps);
      });
    };

    if (isTracking) subscribeToPedometer();
    return () => pedometerSubscription.current?.remove();
  }, [isTracking]);

  /**
   * Speed from steps over a rolling window
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
    const mps = meters / dtSec;
    return Math.min(mps * 3.6, MAX_SPEED);
  };

  /**
   * GPS speed fallback from position deltas
   */
  const calculateSpeedFallback = (newLoc: Location.LocationObject, effMaxAcc: number): number => {
    if (!prevLocation.current || prevTimestamp.current === 0) return 0;

    const timeDiff = (newLoc.timestamp - prevTimestamp.current) / 1000;
    if (timeDiff <= 0) return 0;

    const acc1 = newLoc.coords.accuracy ?? 999;
    const acc2 = prevLocation.current.coords.accuracy ?? 999;
    if (acc1 > effMaxAcc || acc2 > effMaxAcc) return 0;

    const dist = calculateDistance(
      prevLocation.current.coords.latitude,
      prevLocation.current.coords.longitude,
      newLoc.coords.latitude,
      newLoc.coords.longitude
    ); // meters

    const driftFactor = effMaxAcc > BASE_MAX_ACCURACY ? INDOOR_DRIFT_FACTOR : BASE_DRIFT_FACTOR;
    if (dist <= (acc1 + acc2) * driftFactor) return 0;

    const speedKmh = (dist / timeDiff) * 3.6;
    return Math.min(speedKmh, MAX_SPEED);
  };

  /**
   * Stationary flag update on each sample
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
   * Core GPS handler — blends GPS + step fallback and **decays speed to zero**
   */
  const handleLocationUpdate = (newLoc: Location.LocationObject) => {
    const now = Date.now();
    const acc = newLoc.coords.accuracy ?? 999;

    // Recent step gains inside the rolling window
    const recentStepGain = stepWindowRef.current.reduce((a, b) => a + b.steps, 0);
    const likelyIndoor = isLikelyIndoor(acc, recentStepGain);

    // Choose thresholds per mode
    const effMaxAcc = likelyIndoor ? INDOOR_MAX_ACCURACY : BASE_MAX_ACCURACY;
    const effMinMove = likelyIndoor ? INDOOR_MIN_MOVE_METERS : BASE_MIN_MOVE_METERS;
    const effDriftFactor = likelyIndoor ? INDOOR_DRIFT_FACTOR : BASE_DRIFT_FACTOR;

    // If accuracy is too poor (even for indoor), rely on steps only
    if (acc > effMaxAcc) {
      const spdFromSteps = speedFromStepsKmh();

      // If steps moved, add distance from steps
      if (spdFromSteps > 0 && recentStepGain > 0) {
        lastMovementAtRef.current = now;

        requestAnimationFrame(() => {
          setSpeed(Number(spdFromSteps.toFixed(1)));
          setDistance((prevKm) => prevKm + (recentStepGain * STRIDE_M) / 1000);
          setUpdateCount((p) => p + 1);
        });

        // Clear step window to avoid double counting
        stepWindowRef.current.length = 0;
      } else {
        // No valid movement => decay speed to zero
        requestAnimationFrame(() => {
          setSpeed(0);
          setUpdateCount((p) => p + 1);
        });
      }

      prevLocation.current = newLoc;
      prevTimestamp.current = newLoc.timestamp;
      return;
    }

    // ===== GPS displacement =====
    let deltaMeters = 0;

    if (prevLocation.current) {
      const dist = calculateDistance(
        prevLocation.current.coords.latitude,
        prevLocation.current.coords.longitude,
        newLoc.coords.latitude,
        newLoc.coords.longitude
      ); // meters

      const accPrev = prevLocation.current.coords.accuracy ?? 999;
      const minMove = Math.max(effMinMove, (accPrev + acc) * effDriftFactor);

      if (dist > minMove) {
        deltaMeters = dist;
      }
    }

    // ===== Speed from GPS or steps fallback =====
    const gpsSpeedMs = newLoc.coords.speed;
    let spdKmh =
      typeof gpsSpeedMs === 'number' && gpsSpeedMs > 0
        ? gpsSpeedMs * 3.6
        : calculateSpeedFallback(newLoc, effMaxAcc);

    if (!spdKmh || spdKmh <= 0) {
      const spdFromSteps = speedFromStepsKmh();
      if (spdFromSteps > 0) spdKmh = spdFromSteps;
    }

    // Update stationary state
    updateStationaryFlag(deltaMeters, spdKmh);

    // Movement watchdog: mark last movement when we see convincing movement
    if (deltaMeters > 0 || (spdKmh && spdKmh > STATIONARY_SPEED_KMH) || recentStepGain > 0) {
      lastMovementAtRef.current = now;
    }

    // If declared stationary, prefer zero unless steps indicate otherwise
    if (isStationaryRef.current) {
      const spdFromSteps = speedFromStepsKmh();
      if (spdFromSteps <= STATIONARY_SPEED_KMH) {
        deltaMeters = 0;
        spdKmh = 0;
      } else {
        spdKmh = spdFromSteps;
      }
    }

    // ===== Smooth speed — include zeros so it can drop! =====
    const currentSpd = Math.max(0, spdKmh || 0);
    speedHistory.current = [...speedHistory.current.slice(-HISTORY_SIZE + 1), currentSpd];
    const avgSpeed =
      speedHistory.current.reduce((a, b) => a + b, 0) / speedHistory.current.length;

    // ===== Batch state update with zero-decay =====
    requestAnimationFrame(() => {
      let smoothed = Number(avgSpeed.toFixed(1));

      // If no movement seen recently, force speed to zero and clear history
      if (!lastMovementAtRef.current || now - lastMovementAtRef.current > NO_MOVE_TIMEOUT_MS) {
        smoothed = 0;
        speedHistory.current = [];
      }

      setLocation(newLoc);
      setSpeed(smoothed);

      // Distance from GPS
      if (deltaMeters > 0) {
        setDistance((prevKm) => prevKm + deltaMeters / 1000);
      }

      // If GPS didn't move but steps did => add step distance and clear window
      if (deltaMeters === 0 && recentStepGain > 0) {
        setDistance((prevKm) => prevKm + (recentStepGain * STRIDE_M) / 1000);
        stepWindowRef.current.length = 0;
      }

      setUpdateCount((p) => p + 1);
    });

    prevLocation.current = newLoc;
    prevTimestamp.current = newLoc.timestamp;
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

      speedHistory.current = [];
      moveHistory.current = [];
      speedHistoryWindow.current = [];
      isStationaryRef.current = false;

      prevLocation.current = null;
      prevTimestamp.current = 0;

      prevStepsRef.current = 0;
      stepWindowRef.current = [];

      lastMovementAtRef.current = 0;

      // Permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      // Watch position
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Highest,
          distanceInterval: 2,       // indoor 1–3m, outdoor 3–10m
          timeInterval: 1000,        // 1s updates
          mayShowUserSettingsDialog: true,
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
    pedometerSubscription.current?.remove();
    setIsTracking(false);
    setSpeed(0);
    setUpdateCount(0);
    setLocation(null);

    speedHistory.current = [];
    moveHistory.current = [];
    speedHistoryWindow.current = [];
    isStationaryRef.current = false;

    prevLocation.current = null;
    prevTimestamp.current = 0;

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
