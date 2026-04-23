import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import database from '@react-native-firebase/database';
import Geolocation from 'react-native-geolocation-service';
import notifee, { AndroidCategory, AndroidImportance, EventType } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EncryptedStorage from 'react-native-encrypted-storage';
import {
  classifyLocationError,
  writeLocationError,
  clearLocationError,
} from './src/utils/locationError';
import App from './App';
import { name as appName } from './app.json';

const CHANNEL_ID = 'family-safety';

async function ensureChannel() {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Family Safety',
    importance: AndroidImportance.HIGH,
  });
}

async function captureAndWriteLocation(userId, familyGroupId) {
  return new Promise(resolve => {
    Geolocation.getCurrentPosition(
      async position => {
        try {
          await database()
            .ref(`/familyGroups/${familyGroupId}/memberStatus/${userId}/location`)
            .set({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp,
            });
          await clearLocationError(familyGroupId, userId);
        } finally {
          resolve(null);
        }
      },
      async err => {
        await writeLocationError(familyGroupId, userId, classifyLocationError(err));
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    );
  });
}

// Fires when a data-only FCM message arrives and the app is in background or killed state.
messaging().setBackgroundMessageHandler(async remoteMessage => {
  const data = remoteMessage.data;
  if (!data?.type) return;

  await ensureChannel();

  if (data.type === 'check_in_request') {
    // Show notification immediately — don't await GPS before displaying
    await notifee.displayNotification({
      id: data.check_in_id,
      title: data.title,
      body: data.body,
      data: { checkInId: data.check_in_id, groupId: data.group_id, type: data.type },
      android: {
        channelId: CHANNEL_ID,
        importance: AndroidImportance.HIGH,
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
        channelId: CHANNEL_ID,
        importance: AndroidImportance.HIGH,
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
