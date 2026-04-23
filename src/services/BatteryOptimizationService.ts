import { NativeModules, Platform } from 'react-native';

interface BatteryOptimizationNative {
  isIgnoringBatteryOptimizations(): Promise<boolean>;
  requestIgnoreBatteryOptimizations(): Promise<void>;
  canUseFullScreenIntent(): Promise<boolean>;
  openFullScreenIntentSettings(): Promise<void>;
}

const native = NativeModules.BatteryOptimization as BatteryOptimizationNative | undefined;

class BatteryOptimizationService {
  async isIgnoring(): Promise<boolean> {
    if (Platform.OS !== 'android' || !native) return true;
    try {
      return await native.isIgnoringBatteryOptimizations();
    } catch {
      return false;
    }
  }

  async requestIgnore(): Promise<void> {
    if (Platform.OS !== 'android' || !native) return;
    try {
      await native.requestIgnoreBatteryOptimizations();
    } catch {
      // User cancelled, activity unavailable, or OEM blocked the intent.
    }
  }

  async canUseFullScreenIntent(): Promise<boolean> {
    if (Platform.OS !== 'android' || !native) return true;
    try {
      return await native.canUseFullScreenIntent();
    } catch {
      return true;
    }
  }

  async openFullScreenIntentSettings(): Promise<void> {
    if (Platform.OS !== 'android' || !native) return;
    try {
      await native.openFullScreenIntentSettings();
    } catch { }
  }
}

export default new BatteryOptimizationService();
