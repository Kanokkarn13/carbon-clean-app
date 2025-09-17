// hooks/useTracking.ts
import { useState, useEffect, useRef } from 'react';
import { Pedometer } from 'expo-sensors';
import * as Location from 'expo-location';
import { calculateDistance } from '../utils/distance';

// ===== Configuration =====
const MAX_ACCURACY = 35;            // m (ignore update if accuracy แย่มาก)
const MAX_SPEED = 150;              // km/h (cap)
const HISTORY_SIZE = 5;             // smoothing ความเร็ว

// Drift guards
const MIN_MOVE_METERS_BASE = 5;     // ระยะฐานขั้นต่ำที่ยอมรับว่า "ขยับจริง"
const DRIFT_FACTOR = 1.5;           // คูณกับผลรวม accuracy สองจุด

// Stationary detection (ล็อกเมื่อหยุดนิ่ง)
const STATIONARY_SPEED_KMH = 0.8;   // ต่ำกว่านี้โดยเฉลี่ยถือว่าหยุดนิ่ง
const STATIONARY_WINDOW = 8;        // เก็บประวัติ 8 จุดล่าสุด
const STATIONARY_MOVE_SUM = 6;      // m ถ้าการขยับรวมในหน้าต่าง < 6m = หยุดนิ่ง

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
  const speedHistory = useRef<number[]>([]);

  // สำหรับตรวจจับหยุดนิ่ง
  const moveHistory = useRef<number[]>([]);      // เก็บ displacement (m)
  const speedHistoryWindow = useRef<number[]>([]); // เก็บ speed (km/h)
  const isStationaryRef = useRef<boolean>(false);

  // Time tracking
  useEffect(() => {
    if (isTracking) {
      intervalRef.current = setInterval(() => setTime((p) => p + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isTracking]);

  // Step tracking
  useEffect(() => {
    const subscribeToPedometer = async () => {
      const isAvailable = await Pedometer.isAvailableAsync();
      if (!isAvailable) return;
      pedometerSubscription.current = Pedometer.watchStepCount((result) => {
        setSteps(result.steps);
      });
    };

    if (isTracking) subscribeToPedometer();
    return () => pedometerSubscription.current?.remove();
  }, [isTracking]);

  // Speed calculation fallback (จากตำแหน่ง)
  const calculateSpeedFallback = (newLoc: Location.LocationObject): number => {
    if (!prevLocation.current || prevTimestamp.current === 0) return 0;

    const timeDiff = (newLoc.timestamp - prevTimestamp.current) / 1000;
    if (timeDiff <= 0) return 0;

    const acc1 = newLoc.coords.accuracy ?? 999;
    const acc2 = prevLocation.current.coords.accuracy ?? 999;
    if (acc1 > MAX_ACCURACY || acc2 > MAX_ACCURACY) return 0;

    const dist = calculateDistance(
      prevLocation.current.coords.latitude,
      prevLocation.current.coords.longitude,
      newLoc.coords.latitude,
      newLoc.coords.longitude
    ); // meters

    // ถ้าระยะยังอยู่ในขอบความคลาดเคลื่อนรวม → ถือว่า 0
    if (dist <= (acc1 + acc2) * DRIFT_FACTOR) return 0;

    const speedKmh = (dist / timeDiff) * 3.6;
    return Math.min(speedKmh, MAX_SPEED);
  };

  // อัปเดตสถานะหยุดนิ่ง/เคลื่อนที่ตามหน้าต่างเล็กๆ
  const updateStationaryFlag = (deltaMeters: number, currentSpeedKmh: number) => {
    // เก็บประวัติ displacement (m) และ speed (km/h)
    moveHistory.current = [...moveHistory.current.slice(-STATIONARY_WINDOW + 1), Math.max(0, deltaMeters)];
    speedHistoryWindow.current = [...speedHistoryWindow.current.slice(-STATIONARY_WINDOW + 1), Math.max(0, currentSpeedKmh || 0)];

    const movedSum = moveHistory.current.reduce((a, b) => a + b, 0);
    const avgSpd = speedHistoryWindow.current.length
      ? speedHistoryWindow.current.reduce((a, b) => a + b, 0) / speedHistoryWindow.current.length
      : 0;

    // ถ้าเคลื่อนที่รวมน้อยมาก + ความเร็วเฉลี่ยต่ำ → หยุดนิ่ง
    isStationaryRef.current = (movedSum < STATIONARY_MOVE_SUM) && (avgSpd < STATIONARY_SPEED_KMH);
  };

  // Handle new GPS update
  const handleLocationUpdate = (newLoc: Location.LocationObject) => {
    const acc = newLoc.coords.accuracy ?? 999;
    if (acc > MAX_ACCURACY) {
      // ข้ามอัปเดตที่ accuracy แย่
      return;
    }

    let deltaMeters = 0;

    if (prevLocation.current) {
      const dist = calculateDistance(
        prevLocation.current.coords.latitude,
        prevLocation.current.coords.longitude,
        newLoc.coords.latitude,
        newLoc.coords.longitude
      ); // meters

      // เกณฑ์ขั้นต่ำ: max(ฐาน, (acc_prev + acc_now) * DRIFT_FACTOR)
      const accPrev = prevLocation.current.coords.accuracy ?? 999;
      const minMove =
        Math.max(MIN_MOVE_METERS_BASE, (accPrev + acc) * DRIFT_FACTOR);

      // ถ้าระยะมากกว่าเกณฑ์ → ถือว่าขยับจริง
      if (dist > minMove) {
        deltaMeters = dist;
      }
    }

    // ใช้ GPS speed ถ้ามี ไม่งั้น fallback
    const gpsSpeedMs = newLoc.coords.speed;
    let spdKmh = (typeof gpsSpeedMs === 'number' && gpsSpeedMs > 0)
      ? gpsSpeedMs * 3.6
      : calculateSpeedFallback(newLoc);

    // อัปเดต stationary flag ด้วยข้อมูลรอบนี้
    updateStationaryFlag(deltaMeters, spdKmh);

    // ถ้าถูกจัดว่า "หยุดนิ่ง" → เคลียร์ความเร็วเป็น 0 และไม่บวกระยะ
    if (isStationaryRef.current) {
      deltaMeters = 0;
      spdKmh = 0;
    }

    // Smooth ความเร็ว (เฉลี่ยค่าที่ > 0)
    speedHistory.current = [...speedHistory.current.slice(-HISTORY_SIZE + 1), Math.max(0, spdKmh || 0)];
    const validSpeeds = speedHistory.current.filter((s) => s > 0);
    const avgSpeed = validSpeeds.length
      ? validSpeeds.reduce((a, b) => a + b, 0) / validSpeeds.length
      : 0;

    // อัปเดต state แบบ batch
    requestAnimationFrame(() => {
      setLocation(newLoc);
      setSpeed(Number(avgSpeed.toFixed(1)));
      if (deltaMeters > 0) {
        setDistance((prevKm) => prevKm + deltaMeters / 1000);
      }
      setUpdateCount((p) => p + 1);
    });

    prevLocation.current = newLoc;
    prevTimestamp.current = newLoc.timestamp;
  };

  // Start tracking
  const startTracking = async () => {
    try {
      setDistance(0);
      setTime(0);
      setSteps(0);
      setUpdateCount(0);
      setSpeed(0);
      speedHistory.current = [];
      moveHistory.current = [];
      speedHistoryWindow.current = [];
      isStationaryRef.current = false;
      prevLocation.current = null;
      prevTimestamp.current = 0;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Highest,
          // เพิ่ม distanceInterval เพื่อไม่สาดอัปเดตถี่เกินตอนหยุดนิ่ง
          // 1–5 m แล้วแต่ยูสเคส ลองเริ่มที่ 3m
          distanceInterval: 3,
          // เวลาไม่จำเป็นต้องบังคับถี่ ถ้ามี distanceInterval แล้ว
          timeInterval: 1000,
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

  // Stop tracking
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
