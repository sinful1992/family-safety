import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { Location as LocationType } from '../types';

type PermissionResult = 'granted' | 'denied' | 'blocked';

class LocationService {
  async requestPermission(): Promise<PermissionResult> {
    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') return 'granted';
    if (!canAskAgain) return 'blocked';
    return 'denied';
  }

  async requestBackgroundPermission(): Promise<void> {
    if (Platform.OS !== 'android') return;
    if ((Platform.Version as number) < 29) return;
    try {
      await Location.requestBackgroundPermissionsAsync();
    } catch {
      // Best-effort — foreground alone is usually enough.
    }
  }

  async hasForegroundPermission(): Promise<boolean> {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  }

  async hasBackgroundPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    if ((Platform.Version as number) < 29) return true;
    const { status } = await Location.getBackgroundPermissionsAsync();
    return status === 'granted';
  }

  async getCurrentPosition(): Promise<LocationType> {
    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      throw new Error(
        permission === 'blocked'
          ? 'Location permission is blocked. Please enable it in Settings.'
          : 'Location permission denied.',
      );
    }

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Location request timed out')), 15000),
    );

    const position = await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        mayShowUserSettingsDialog: false,
      }),
      timeout,
    ]);

    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy ?? 0,
      timestamp: position.timestamp,
    };
  }
}

export default new LocationService();
