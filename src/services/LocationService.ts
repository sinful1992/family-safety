import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { Location } from '../types';

type PermissionResult = 'granted' | 'denied' | 'blocked';

class LocationService {
  async requestPermission(): Promise<PermissionResult> {
    if (Platform.OS === 'android') {
      const fine = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );

      if (fine === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
      if (fine === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) return 'blocked';
      return 'denied';
    }

    const auth = await Geolocation.requestAuthorization('whenInUse');
    if (auth === 'granted') return 'granted';
    if (auth === 'disabled' || auth === 'restricted') return 'blocked';
    return 'denied';
  }

  async requestBackgroundPermission(): Promise<void> {
    if (Platform.OS !== 'android') return;
    if ((Platform.Version as number) < 29) return;
    try {
      await PermissionsAndroid.request(
        'android.permission.ACCESS_BACKGROUND_LOCATION' as never,
      );
    } catch {
      // Best-effort — foreground alone is usually enough.
    }
  }

  async hasForegroundPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  }

  async hasBackgroundPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    if ((Platform.Version as number) < 29) return true;
    return PermissionsAndroid.check('android.permission.ACCESS_BACKGROUND_LOCATION' as never);
  }

  async getCurrentPosition(accuracyThreshold = 50, timeout = 20000): Promise<Location> {
    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      throw new Error(
        permission === 'blocked'
          ? 'Location permission is blocked. Please enable it in Settings.'
          : 'Location permission denied.',
      );
    }

    return new Promise((resolve, reject) => {
      let best: Location | null = null;
      let watchId: number;
      let settled = false;

      const done = (loc: Location | null, err?: Error) => {
        if (settled) return;
        settled = true;
        Geolocation.clearWatch(watchId);
        if (err) { reject(err); return; }
        if (loc) { resolve(loc); return; }
        reject(new Error('Location unavailable'));
      };

      const timer = setTimeout(() => done(best), timeout);

      watchId = Geolocation.watchPosition(
        position => {
          const loc: Location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
          if (!best || loc.accuracy < best.accuracy) {
            best = loc;
          }
          if (loc.accuracy <= accuracyThreshold) {
            clearTimeout(timer);
            done(loc);
          }
        },
        error => {
          clearTimeout(timer);
          done(null, new Error(error.message));
        },
        { enableHighAccuracy: true, distanceFilter: 0, interval: 1000, fastestInterval: 500 },
      );
    });
  }
}

export default new LocationService();
