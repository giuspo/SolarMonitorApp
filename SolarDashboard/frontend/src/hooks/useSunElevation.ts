import { useState, useEffect } from 'react';
import { getPosition } from 'suncalc';

interface Location {
  latitude: number;
  longitude: number;
}

export function useSunElevation(location: Location | null, updateIntervalMs: number = 60000) {
  const [elevation, setElevation] = useState<number | null>(null);

  useEffect(() => {
    if (!location) {
      setElevation(null);
      return;
    }

    const calculateElevation = () => {
      const { latitude, longitude } = location;
      const sunPosition = getPosition(new Date(), latitude, longitude);
      
      // suncalc@2.1.0 returns altitude already in degrees
      const elevationDegrees = sunPosition.altitude;
      setElevation(elevationDegrees);
    };

    // Calculate immediately
    calculateElevation();

    // Update periodically
    const intervalId = setInterval(calculateElevation, updateIntervalMs);

    return () => clearInterval(intervalId);
  }, [location, updateIntervalMs]);

  return elevation;
}
