// calculateEmission.ts

// Defining the type for the emission data for different vehicles
export type EmissionData = {
    [fuelType: string]: {
      [vehicleClass: string]: number; // emission factor (kg CO2e per km)
    };
  };
  
  // Emission factors for different vehicle types and their respective classes
  export const emissionData: EmissionData = {
    Diesel: {
      "Small car": 0.13931,
      "Medium car": 0.16716,
      "Large car": 0.20859,
      "Average car": 0.16983,
    },
    Petrol: {
      "Small car": 0.1408,
      "Medium car": 0.17819,
      "Large car": 0.27224,
      "Average car": 0.16391,
    },
    Motorbike: {
      "Small": 0.08319,
      "Medium": 0.10108,
      "Large": 0.13252,
      "Average": 0.11367,
    },
    Taxis: {
      "Regular taxi": 0.148615,
    },
    Bus: {
      "Average local bus": 0.10215,
    },
    Unknown: {
      "Small car": 0.14037,
      "Medium car": 0.17246,
      "Large car": 0.22612,
      "Average car": 0.16664,
    },
  };
  
  // Function to calculate the emission based on activity type and vehicle class
  export function calculateEmission(
    activity: string, // Fuel type, e.g., Diesel, Petrol
    vehicleClass: string, // Vehicle class, e.g., "Small car"
    distance: number // Distance in km
  ): number | string {
    if (distance <= 0) {
      return "Invalid distance"; // Return error if the distance is not valid
    }
  
    const emissionFactor = emissionData[activity]?.[vehicleClass];
  
    // Handle if the provided activity or vehicle class is not available
    if (!emissionFactor) {
      return "Invalid activity or vehicle class";
    }
  
    // Calculate and return the emission
    return emissionFactor * distance;
  }
  