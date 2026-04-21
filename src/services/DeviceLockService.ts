import { NativeModules, Platform } from 'react-native';

const { DeviceLock } = NativeModules;

const DeviceLockService = {
  isActive(): Promise<boolean> {
    if (Platform.OS !== 'android' || !DeviceLock) return Promise.resolve(false);
    return DeviceLock.isDeviceAdminActive();
  },

  requestPermission(): void {
    if (Platform.OS !== 'android' || !DeviceLock) return;
    DeviceLock.requestDeviceAdmin();
  },

  async lock(): Promise<void> {
    if (Platform.OS !== 'android' || !DeviceLock) return;
    try {
      await DeviceLock.lockScreen();
    } catch {
      // Device Admin not granted — alert still sent, lock silently skipped
    }
  },
};

export default DeviceLockService;
