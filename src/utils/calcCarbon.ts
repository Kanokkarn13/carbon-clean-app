// src/utils/calcCarbon.ts
import { calculateEmission } from '../hooks/calculateEmission';

/**
 * Compute carbonReduce (kgCO₂e) for a trip by comparing against user's usual vehicle.
 * @param user expects user.vehicle like "Cars,Gasoline,Small" (category,fuel,size)
 * @param distanceKm trip distance in kilometers
 */
export function computeCarbonReduce(user: any, distanceKm: number): number {
  try {
    const [category, fuel, size] = (user?.vehicle || '').split(',');
    const vehicleClass =
      (category?.trim() === 'Cars'
        ? `${(size || 'Average')?.trim()}${(size || '').includes('car') ? '' : ' car'}`
        : size?.trim()) || undefined;

    const val = calculateEmission(fuel?.trim(), vehicleClass, distanceKm);
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}
