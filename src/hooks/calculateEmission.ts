// src/hooks/calculateEmission.ts
// Pull emission factors from the backend `emission` table instead of hardcoded lists.

import { useEffect, useState } from 'react';

const RAW_ORIGIN = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.102:3000';
const API_ORIGIN = RAW_ORIGIN.replace(/\/+$/, '');
const api = (path: string) => `${API_ORIGIN}/api${path}`;

export type EmissionData = {
  [fuelType: string]: {
    [vehicleClass: string]: number; // emission factor (kg CO2e per km or per passenger.km)
  };
};

type EmissionRow = {
  activity: string;
  type: string | null;
  class: string | null;
  unit?: string | null;
  ef_point: number | null;
  refer?: string | null;
  update_at?: string | null;
  updated_at?: string | null;
};

let emissionData: EmissionData = {};
export { emissionData };
let loadPromise: Promise<EmissionData> | null = null;

const CAR_KEYS = ['Diesel', 'Petrol', 'Hybrid', 'CNG', 'Unknown'] as const;

function normalizeActivityFromRow(activity: string): string {
  const value = (activity || '').trim();
  const lower = value.toLowerCase();
  if (lower.includes('cars')) {
    if (lower.includes('diesel')) return 'Diesel';
    if (lower.includes('petrol')) return 'Petrol';
    if (lower.includes('hybrid')) return 'Hybrid';
    if (lower.includes('cng')) return 'CNG';
    return 'Cars';
  }
  if (lower.startsWith('motorcycle')) return 'Motorbike';
  if (lower.startsWith('bus') || lower.startsWith('buses')) return 'Bus';
  if (lower.startsWith('rail')) return 'Rail';
  if (lower.startsWith('flight')) return 'Flights';
  if (lower.startsWith('ferry')) return 'Ferry';
  if (lower.startsWith('electric')) return 'Electricity';
  if (lower.includes('well-to-tank')) return 'Well-to-tank';
  return value;
}

function buildLabel(row: EmissionRow) {
  const type = row.type?.trim() || '';
  const cls = row.class?.trim() || '';
  if (type && cls) return `${type} - ${cls}`;
  if (type) return type;
  if (cls) return cls;
  return 'default';
}

function isCarActivity(activity: string) {
  const lower = activity.toLowerCase();
  return (
    lower.startsWith('car') ||
    lower.includes('diesel') ||
    lower.includes('petrol') ||
    lower.includes('hybrid') ||
    lower.includes('cng') ||
    lower === 'unknown'
  );
}

function normalizeActivity(activity: string): string {
  const val = (activity || '').trim();
  const lower = val.toLowerCase();
  if (lower.startsWith('motorcycle')) return 'Motorbike';
  if (lower.startsWith('motorbike')) return 'Motorbike';
  if (lower.startsWith('bus') || lower.startsWith('buses')) return 'Bus';
  if (lower.startsWith('rail')) return 'Rail';
  if (lower.startsWith('flight')) return 'Flights';
  if (lower.startsWith('ferry')) return 'Ferry';
  if (lower.startsWith('electric')) return 'Electricity';
  if (lower.startsWith('taxi')) return 'Taxis';
  if (lower.includes('diesel')) return 'Diesel';
  if (lower.includes('petrol')) return 'Petrol';
  if (lower.includes('hybrid')) return 'Hybrid';
  if (lower.includes('cng')) return 'CNG';
  if (lower === 'unknown') return 'Unknown';
  return val;
}

function normalizeVehicleClass(cls: string, activity?: string): string {
  const raw = (cls || '').trim();
  const lower = raw.toLowerCase();

  if (activity && isCarActivity(activity)) {
    if (lower === 'small') return 'Small car';
    if (lower === 'medium') return 'Medium car';
    if (lower === 'large') return 'Large car';
    if (lower === 'average') return 'Average car';
  }

  if (lower === 'average local bus') return 'Local bus';
  if (lower === 'coach bus') return 'Coach';
  if (lower === 'kwh' || lower === 'kw-h' || lower === 'kw/h') return 'Kwh';
  return raw;
}

function buildEmissionData(rows: EmissionRow[]): EmissionData {
  const table: EmissionData = {};

  rows.forEach((row) => {
    if (row.ef_point == null) return;
    const isWellToTank =
      (row.class && row.class.toLowerCase().includes('well-to-tank')) ||
      (row.type && row.type.toLowerCase().includes('well-to-tank'));
    if (isWellToTank) return; // keep UI simple; skip well-to-tank rows

    const activity = normalizeActivityFromRow(row.activity);
    const label = buildLabel(row);
    if (!table[activity]) table[activity] = {};
    table[activity][label] = row.ef_point;
  });

  // Fill Unknown cars with averages across known fuels.
  const carClasses = new Set<string>();
  CAR_KEYS.forEach((k) => {
    if (table[k]) Object.keys(table[k]).forEach((c) => carClasses.add(c));
  });
  const unknown: Record<string, number> = {};
  carClasses.forEach((cls) => {
    const factors = CAR_KEYS.filter((k) => k !== 'Unknown')
      .map((k) => table[k]?.[cls])
      .filter((n): n is number => typeof n === 'number');
    if (factors.length) unknown[cls] = factors.reduce((a, b) => a + b, 0) / factors.length;
  });
  if (Object.keys(unknown).length) {
    table.Unknown = { ...(table.Unknown || {}), ...unknown };
  }

  // Alias: Motorbike vs Motorcycles wording.
  if (table.Motorbike && !table.Motorcycles) table.Motorcycles = { ...table.Motorbike };

  // Alias: keep bus label used in UI.
  if (table.Bus?.['Local bus']) {
    table.Bus['Average local bus'] = table.Bus['Local bus'];
  }

  // Add a default taxi factor (table does not include taxis).
  if (!table.Taxis) table.Taxis = {};
  if (typeof table.Taxis['Regular taxi'] !== 'number') {
    table.Taxis['Regular taxi'] = 0.148615;
  }

  return table;
}

async function fetchEmissionRows(): Promise<EmissionRow[]> {
  const res = await fetch(api('/emission/factors'));
  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  const json = text ? JSON.parse(text) : {};
  const items: any[] = Array.isArray(json) ? json : Array.isArray(json?.items) ? json.items : [];
  return items as EmissionRow[];
}

export async function loadEmissionData(force = false): Promise<EmissionData> {
  if (!force && Object.keys(emissionData).length > 0) return emissionData;
  if (loadPromise && !force) return loadPromise;

  loadPromise = (async () => {
    const rows = await fetchEmissionRows();
    emissionData = buildEmissionData(rows);
    loadPromise = null;
    return emissionData;
  })();

  return loadPromise;
}

export function getEmissionData(): EmissionData {
  return emissionData;
}

// Kick off a background load so the cache fills early.
loadEmissionData().catch(() => {});

// React helper for screens that need factor data.
export function useEmissionFactors() {
  const [data, setData] = useState<EmissionData>(emissionData);
  const [loading, setLoading] = useState<boolean>(!Object.keys(emissionData).length);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadEmissionData()
      .then((d) => {
        if (!active) return;
        setData({ ...d });
        setLoading(false);
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err?.message || 'Failed to load emission factors');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { data, loading, error, reload: loadEmissionData };
}

// Function to calculate the emission based on activity type and vehicle class
export function calculateEmission(
  activity: string, // Fuel type or activity, e.g., Diesel, Petrol, Motorbike
  vehicleClass: string, // Vehicle class, e.g., "Small car"
  distance: number // Distance in km
): number | string {
  if (!(distance > 0)) {
    return 'Invalid distance'; // Return error if the distance is not valid
  }

  const factor = getEmissionFactor(activity, vehicleClass);

  if (typeof factor !== 'number') {
    return 'Emission factor unavailable';
  }

  return factor * distance;
}

function getEmissionFactor(activity: string, vehicleClass: string): number | undefined {
  const activityKey = normalizeActivity(activity);
  const classKey = normalizeVehicleClass(vehicleClass, activityKey);

  const attempts: Array<[string, string]> = [
    [activityKey, classKey],
    [activityKey, vehicleClass],
    [activity, classKey],
    [activity, vehicleClass],
  ];

  for (const [act, cls] of attempts) {
    const val = emissionData[act]?.[cls];
    if (typeof val === 'number') return val;
  }

  return undefined;
}
