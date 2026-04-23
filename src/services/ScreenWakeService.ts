import { NativeModules, Platform } from 'react-native';

interface ScreenWakeNative {
  setKeepScreenOn(keep: boolean): Promise<void>;
}

const native = NativeModules.ScreenWake as ScreenWakeNative | undefined;

class ScreenWakeService {
  async setKeepScreenOn(keep: boolean): Promise<void> {
    if (Platform.OS !== 'android' || !native) return;
    try {
      await native.setKeepScreenOn(keep);
    } catch {
      // Activity may be unavailable (e.g. during navigation transition).
    }
  }
}

export default new ScreenWakeService();
