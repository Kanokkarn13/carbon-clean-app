// hooks/useTracking.ts
import { useState, useEffect, useRef } from 'react';
import { Pedometer } from 'expo-sensors';
import * as Location from 'expo-location';
import { calculateDistance } from '../utils/distance'; // Assuming you have a utility function for distance calculation

// Configuration
const MAX_ACCURACY = 35; // meters
const MAX_SPEED = 150; // km/h
const HISTORY_SIZE = 5; // Smoothing buffer

export const useTracking = () => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [speed, setSpeed] = useState<number>(0);
  const [distance, setDistance] = useState<number>(0);
  const [time, setTime] = useState<number>(0);
  const [steps, setSteps] = useState<number>(0);
  const [isTracking, setIsTracking] = useState(false);
  const [subscription, setSubscription] = useState<Location.LocationSubscription | null>(null);
  const [updateCount, setUpdateCount] = useState(0);

  const prevLocation = useRef<Location.LocationObject | null>(null);
  const prevTimestamp = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pedometerSubscription = useRef<Pedometer.Subscription | null>(null);
  const speedHistory = useRef<number[]>([]);

  // Time tracking
  useEffect(() => {
    if (isTracking) {
      intervalRef.current = setInterval(() => {
        setTime((prev) => prev + 1);
      }, 1000);
    } else {
      intervalRef.current && clearInterval(intervalRef.current);
    }
    return () => {
      intervalRef.current && clearInterval(intervalRef.current);
    };
  }, [isTracking]);

  // Step tracking
  useEffect(() => {
    const subscribeToPedometer = async () => {
      const isAvailable = await Pedometer.isAvailableAsync();
      if (!isAvailable) return;

      pedometerSubscription.current = Pedometer.watchStepCount(result => {
        setSteps(result.steps);
      });
    };

    isTracking && subscribeToPedometer();
    return () => {
      pedometerSubscription.current?.remove();
    };
  }, [isTracking]);

  // Speed calculation fallback
  const calculateSpeedFallback = (newLoc: Location.LocationObject): number => {
    if (!prevLocation.current || prevTimestamp.current === 0) return 0;

    const timeDiff = (newLoc.timestamp - prevTimestamp.current) / 1000;
    if (timeDiff <= 0) return 0;

    const acc1 = newLoc.coords.accuracy;
    const acc2 = prevLocation.current.coords.accuracy;
    if (acc1 > MAX_ACCURACY || acc2 > MAX_ACCURACY) return 0;

    const dist = calculateDistance(
      prevLocation.current.coords.latitude,
      prevLocation.current.coords.longitude,
      newLoc.coords.latitude,
      newLoc.coords.longitude
    );

    if (dist < acc1 + acc2) return 0;

    const speedKmh = (dist / timeDiff) * 3.6;
    return Math.min(speedKmh, MAX_SPEED);
  };

  // Handle new GPS update
  const handleLocationUpdate = (newLoc: Location.LocationObject) => {
    if (prevLocation.current) {
      const dist = calculateDistance(
        prevLocation.current.coords.latitude,
        prevLocation.current.coords.longitude,
        newLoc.coords.latitude,
        newLoc.coords.longitude
      );

      if (dist > 0.5) {
        setDistance(prev => prev + dist / 1000); // Add in km
      }
    }

    // Use GPS speed if available
    let currentSpeed = newLoc.coords.speed;
    let speedKmh = currentSpeed && currentSpeed > 0
      ? currentSpeed * 3.6
      : calculateSpeedFallback(newLoc);

    // Smooth the speed
    speedHistory.current = [...speedHistory.current.slice(-HISTORY_SIZE + 1), speedKmh];
    const validSpeeds = speedHistory.current.filter(s => s > 0);
    const averageSpeed = validSpeeds.length
      ? validSpeeds.reduce((a, b) => a + b, 0) / validSpeeds.length
      : 0;

    requestAnimationFrame(() => {
      setLocation(newLoc);
      setSpeed(Number(averageSpeed.toFixed(1)));
      setUpdateCount(prev => prev + 1);
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
      prevLocation.current = null;
      prevTimestamp.current = 0;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Highest,
          timeInterval: 1000,
          distanceInterval: 0,
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
    setIsTracking(false);
    setSpeed(0);
    setUpdateCount(0);
    setLocation(null);
    speedHistory.current = [];
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