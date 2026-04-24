import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import database from '@react-native-firebase/database';
import Geolocation from 'react-native-geolocation-service';
import notifee, { AndroidCategory, AndroidImportance, AndroidVisibility, EventType } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EncryptedStorage from 'react-native-encrypted-storage';
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
  await Promise.all([
    notifee.createChannel({
      id: CHANNEL_ALERTS,
      name: 'Family Safety Alerts',
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      vibration: true,
      vibrationPattern: [300, 1000, 150, 1000, 150, 1000],
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
  const ACCURACY_GOAL = 50; // metres — stop once GPS is this accurate
  const MAX_WAIT_MS = 20000;

  return new Promise(resolve => {
    let watchId;
    let firstWritten = false;
    let finished = false;

    const writeLocation = loc =>
      database()
        .ref(`/familyGroups/${familyGroupId}/memberStatus/${userId}/location`)
        .set(loc)
        .then(() => clearLocationError(familyGroupId, userId))
        .catch(() => {});

    const finish = async loc => {
      if (finished) return;
      finished = true;
      Geolocation.clearWatch(watchId);
      if (loc) await writeLocation(loc);
      resolve(null);
    };

    const timer = setTimeout(() => finish(null), MAX_WAIT_MS);

    watchId = Geolocation.watchPosition(
      async position => {
        if (finished) return;
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };

        // Ping 1: write first reading immediately (fast, rough cell/WiFi fix)
        if (!firstWritten) {
          firstWritten = true;
          writeLocation(loc); // fire-and-forget
        }

        // Ping 2: write again once GPS gives an accurate fix, then stop
        if (loc.accuracy <= ACCURACY_GOAL) {
          clearTimeout(timer);
          await finish(loc);
        }
      },
      async err => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        Geolocation.clearWatch(watchId);
        await writeLocationError(familyGroupId, userId, classifyLocationError(err));
        resolve(null);
      },
      { enableHighAccuracy: true, distanceFilter: 0, interval: 1000, fastestInterval: 500 },
    );
  });
}

// Fires when a data-only FCM message arrives and the app is in background or killed state.
messaging().setBackgroundMessageHandler(async remoteMessage => {
  const data = remoteMessage.data;
  if (!data?.type) return;

  await ensureChannels();

  if (data.type === 'check_in_request') {
    // Write pending check-in before displaying — fullScreenAction launches
    // MainActivity from background but no other path navigates there.
    await AsyncStorage.setItem('@pending_checkin', JSON.stringify({
      checkInId: data.check_in_id,
      groupId: data.group_id,
    }));

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
