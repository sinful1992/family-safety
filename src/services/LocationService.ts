import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { Location } from '../types';

type PermissionResult = 'granted' | 'denied' | 'blocked';

class LocationService {
  async requestPermission(): Promise<PermissionResult> {
    if (Platform.OS === 'android') {
      const fine = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'Family Safety needs your location to respond to check-ins.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );

      if (fine !== PermissionsAndroid.RESULTS.GRANTED) {
        if (fine === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) return 'blocked';
        return 'denied';
      }

      // Foreground granted — on Android 10+, separately request background
      // location so FCM-triggered captures still work when the app is killed
      // or in doze. On Android 11+ this opens Settings for the user to choose
      // "Allow all the time". Best-effort — foreground alone is usually enough.
      if ((Platform.Version as number) >= 29) {
        try {
          await PermissionsAndroid.request(
            'android.permission.ACCESS_BACKGROUND_LOCATION' as never,
            {
              title: 'Always-on Location',
              message: 'Allow "all the time" so family can locate you even when your phone is locked.',
              buttonPositive: 'Continue',
              buttonNegative: 'Not now',
            },
          );
        } catch {
          // Ignore — fine location is still granted.
        }
      }

      return 'granted';
    }

    const auth = await Geolocation.requestAuthorization('whenInUse');
    if (auth === 'granted') return 'granted';
    if (auth === 'disabled' || auth === 'restricted') return 'blocked';
    return 'denied';
  }

  async getCurrentPosition(): Promise<Location> {
    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      throw new Error(
        permission === 'blocked'
          ? 'Location permission is blocked. Please enable it in Settings.'
          : 'Location permission denied.',
      );
    }

    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        position => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          });
        },
        error => reject(new Error(error.message)),
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        },
      );
    });
  }
}

export default new LocationService();
