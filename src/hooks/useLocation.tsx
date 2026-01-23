import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface LocationInfo extends LocationCoords {
  address?: string;
}

export function useLocation() {
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requestPermission = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission to access location was denied');
        return false;
      }
      return true;
    } catch (err) {
      setError(`Failed to request permission: ${err}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async (): Promise<LocationInfo | null> => {
    try {
      setLoading(true);
      setError(null);

      const hasPermission = await requestPermission();
      if (!hasPermission) return null;

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const locationInfo: LocationInfo = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };

      // Try to get address from coordinates
      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude: locationInfo.latitude,
          longitude: locationInfo.longitude,
        });

        if (addresses && addresses.length > 0) {
          const addr = addresses[0];
          const addressParts = [addr.street, addr.city, addr.region].filter(Boolean);
          locationInfo.address = addressParts.join(', ');
        }
      } catch (geocodeError) {
        // Silently fail - address is optional
        console.log('Reverse geocoding not available');
      }

      setLocation(locationInfo);
      return locationInfo;
    } catch (err) {
      const errorMsg = `Failed to get location: ${err}`;
      setError(errorMsg);
      console.error(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  return {
    location,
    error,
    loading,
    getCurrentLocation,
    requestPermission,
    getDistance,
  };
}
