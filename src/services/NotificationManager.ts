import messaging from '@react-native-firebase/messaging';
import database from '@react-native-firebase/database';
import { AppState, PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EncryptedStorage from 'react-native-encrypted-storage';
import notifee, { AndroidCategory, AndroidImportance, AndroidVisibility, EventType } from '@notifee/react-native';
import supabase from './SupabaseClient';
import LocationService from './LocationService';
import { classifyLocationError, writeLocationError, clearLocationError } from '../utils/locationError';

type NavigateToCheckIn = (checkInId: string, groupId: string) => void;

const CHANNEL_ALERTS = 'family-safety-alerts';
const CHANNEL_INFO = 'family-safety-info';

class NotificationManager {
  private fcmToken: string | null = null;
  private navigateToCheckIn: NavigateToCheckIn | null = null;
  private listenersInitialized = false;

  setNavigationHandler(handler: NavigateToCheckIn): void {
    this.navigateToCheckIn = handler;
  }

  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }

      const authStatus = await messaging().requestPermission();
      return (
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL
      );
    } catch {
      return false;
    }
  }

  async getFCMToken(): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const token = await messaging().getToken();
      this.fcmToken = token;
      return token;
    } catch {
      return null;
    }
  }

  async registerToken(userId: string, familyGroupId: string): Promise<void> {
    try {
      const token = await this.getFCMToken();
      if (!token) return;

      const ref = database().ref(`/users/${userId}/fcmToken`);
      const snap = await ref.once('value');
      if (snap.val() !== token) {
        await ref.set(token);
      }

      const { error } = await supabase.functions.invoke('register-device-token', {
        body: { user_id: userId, family_group_id: familyGroupId, fcm_token: token, platform: Platform.OS },
      });
      if (error) throw error;

      await EncryptedStorage.setItem(
        '@fcm_token_data',
        JSON.stringify({ token, userId, familyGroupId, registeredAt: Date.now() }),
      );
    } catch {
      // Token registration failed — will retry later
    }
  }

  private async ensureChannels(): Promise<void> {
    await Promise.all([
      notifee.createChannel({
        id: CHANNEL_ALERTS,
        name: 'Family Safety Alerts',
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        vibration: true,
        vibrationPattern: [300, 400, 200, 400, 200, 400],
        sound: 'default',
      }),
      notifee.createChannel({
        id: CHANNEL_INFO,
        name: 'Family Safety',
        importance: AndroidImportance.DEFAULT,
        visibility: AndroidVisibility.PRIVATE,
      }),
    ]);
  }

  private navigate(checkInId: string, groupId: string, delay = 0): void {
    if (!this.navigateToCheckIn) return;
    if (delay) {
      setTimeout(() => this.navigateToCheckIn!(checkInId, groupId), delay);
    } else {
      this.navigateToCheckIn(checkInId, groupId);
    }
  }

  initializeListeners(): void {
    if (this.listenersInitialized) return;
    this.listenersInitialized = true;

    // Foreground: data-only FCM message received
    messaging().onMessage(async remoteMessage => {
      const data = remoteMessage.data;
      if (!data?.type) return;

      await this.ensureChannels();

      if (data.type === 'check_in_request') {
        // Capture location immediately before showing UI
        try {
          const tokenData = await EncryptedStorage.getItem('@fcm_token_data');
          if (tokenData) {
            const { userId, familyGroupId } = JSON.parse(tokenData);
            LocationService.getCurrentPosition()
              .then(async loc => {
                await database()
                  .ref(`/familyGroups/${familyGroupId}/memberStatus/${userId}/location`)
                  .set(loc);
                await clearLocationError(familyGroupId, userId);
              })
              .catch(err => writeLocationError(familyGroupId, userId, classifyLocationError(err)));
          }
        } catch { }

        await notifee.displayNotification({
          id: data.check_in_id as string,
          title: data.title as string,
          body: data.body as string,
          data: { checkInId: data.check_in_id, groupId: data.group_id, type: data.type },
          android: {
            channelId: CHANNEL_ALERTS,
            category: AndroidCategory.CALL,
            pressAction: { id: 'default', launchActivity: 'default' },
            fullScreenAction: { id: 'default', launchActivity: 'default' },
          },
        });

        this.navigate(data.check_in_id as string, data.group_id as string);
      } else if (data.type === 'check_in_response') {
        await notifee.displayNotification({
          title: data.title as string,
          body: data.body as string,
          android: { channelId: CHANNEL_INFO },
        });
      } else if (data.type === 'help_alert') {
        await notifee.displayNotification({
          title: data.title as string,
          body: data.body as string,
          android: {
            channelId: CHANNEL_ALERTS,
            pressAction: { id: 'default' },
          },
        });
      }
    });

    // Foreground: user taps a Notifee notification
    notifee.onForegroundEvent(({ type, detail }) => {
      if (type !== EventType.PRESS) return;
      const d = detail.notification?.data;
      if (d?.type === 'check_in_request' && d.checkInId) {
        this.navigate(d.checkInId as string, d.groupId as string);
      }
    });

    // Killed state: app opened by tapping a Notifee notification
    notifee.getInitialNotification().then(initial => {
      if (!initial) return;
      const d = initial.notification.data;
      if (d?.type === 'check_in_request' && d.checkInId) {
        this.navigate(d.checkInId as string, d.groupId as string, 500);
      }
    });

    // Check pending check-in on init (killed state) and on every foreground
    // transition (background → active via fullScreenAction or notification tap).
    const checkPending = () => {
      AsyncStorage.getItem('@pending_checkin').then(stored => {
        if (!stored) return;
        AsyncStorage.removeItem('@pending_checkin');
        const { checkInId, groupId } = JSON.parse(stored);
        this.navigate(checkInId, groupId, 300);
      });
    };
    checkPending();
    AppState.addEventListener('change', nextState => {
      if (nextState === 'active') checkPending();
    });

    // FCM token refresh
    messaging().onTokenRefresh(async token => {
      this.fcmToken = token;
      try {
        const tokenData = await EncryptedStorage.getItem('@fcm_token_data');
        if (tokenData) {
          const { userId, familyGroupId } = JSON.parse(tokenData);
          await this.registerToken(userId, familyGroupId);
        }
      } catch { }
    });
  }

  async clearToken(): Promise<void> {
    try {
      await messaging().deleteToken();
      await EncryptedStorage.removeItem('@fcm_token_data');
      this.fcmToken = null;
    } catch { }
  }
}

export default new NotificationManager();
