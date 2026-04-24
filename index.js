import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import database from '@react-native-firebase/database';
import * as Location from 'expo-location';
import notifee, { AndroidCategory, AndroidImportance, AndroidVisibility, EventType } from 'react-native-notify-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SecureStorage as EncryptedStorage } from './src/services/SecureStorage';
import {
  classifyLocationError,
  writeLocationError,
  clearLocationError,
} from './src/utils/locationError';
import App from './App';
import { name as appName } from './app.json';

const CHANNEL_ALERTS = 'family-safety-alerts';
const CHANNEL_INFO = 'family-safety-info';

async function ensureChannels() {
  await notifee.deleteChannel('family-safety');
  await Promise.all([
    notifee.createChannel({
      id: CHANNEL_ALERTS,
      name: 'Family Safety Alerts',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      vibration: true,
      vibrationPattern: [0, 400, 200, 400, 200, 400],
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

async function captureAndWriteLocation(userId, familyGroupId) {
  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    await database()
      .ref(`/familyGroups/${familyGroupId}/memberStatus/${userId}/location`)
      .set({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy ?? 0,
        timestamp: position.timestamp,
      });
    await clearLocationError(familyGroupId, userId);
  } catch (err) {
    await writeLocationError(familyGroupId, userId, classifyLocationError(err));
  }
}

// Fires when a data-only FCM message arrives and the app is in background or killed state.
messaging().setBackgroundMessageHandler(async remoteMessage => {
  const data = remoteMessage.data;
  if (!data?.type) return;

  await ensureChannels();

  if (data.type === 'check_in_request') {
    // Show notification immediately — don't await GPS before displaying
    await notifee.displayNotification({
      id: data.check_in_id,
      title: data.title,
      body: data.body,
      data: { checkInId: data.check_in_id, groupId: data.group_id, type: data.type },
      android: {
        channelId: CHANNEL_ALERTS,
        category: AndroidCategory.CALL,
        pressAction: { id: 'default', launchActivity: 'default' },
        fullScreenAction: { id: 'default', launchActivity: 'default' },
      },
    });

    // auth().currentUser is null in headless background context — use stored credentials instead
    try {
      const tokenData = await EncryptedStorage.getItem('@fcm_token_data');
      if (tokenData) {
        const { userId, familyGroupId } = JSON.parse(tokenData);
        if (userId && familyGroupId) {
          captureAndWriteLocation(userId, familyGroupId).catch(() => {});
        }
      }
    } catch { }
  } else {
    await notifee.displayNotification({
      id: data.check_in_id,
      title: data.title,
      body: data.body,
      data: { checkInId: data.check_in_id, groupId: data.group_id, type: data.type },
      android: {
        channelId: CHANNEL_INFO,
        pressAction: { id: 'default' },
      },
    });
  }
});

// Handles notification tap while app is in background state.
// Stores pending navigation so initializeListeners can pick it up when app foregrounds.
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS) {
    const d = detail.notification?.data;
    if (d?.checkInId) {
      await AsyncStorage.setItem('@pending_checkin', JSON.stringify({
        checkInId: d.checkInId,
        groupId: d.groupId,
      }));
    }
  }
});

AppRegistry.registerComponent(appName, () => App);
