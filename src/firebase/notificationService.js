import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { arrayUnion, collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from './config';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

export async function registerPushToken(userId) {
  try {
    const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
    if (Platform.OS === 'web' || !db || !projectId || !userId) return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('studentnet', {
        name: 'StudentNet activity',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    const current = await Notifications.getPermissionsAsync();
    const permission = current.status === 'granted' ? current : await Notifications.requestPermissionsAsync();
    if (permission.status !== 'granted') return null;

    const result = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = typeof result?.data === 'string' ? result.data.trim() : '';
    if (!token) return null;
    await updateDoc(doc(db, 'users', userId), {
      pushToken: token,
      expoPushTokens: arrayUnion(token),
      pushTokenUpdatedAt: serverTimestamp(),
    });
    return token;
  } catch (error) {
    console.warn('Push token registration unavailable:', error?.message || error);
    return null;
  }
}

export function listenToUserNotifications(userId, onData, onError) {
  if (!db || !userId) return () => {};
  const notifications = query(
    collection(db, 'users', userId, 'notifications'),
    orderBy('createdAt', 'desc'),
    limit(20),
  );
  return onSnapshot(notifications, snapshot => {
    onData(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
  }, onError);
}

export async function markNotificationRead(userId, notificationId) {
  if (!db || !userId || !notificationId) return;
  await updateDoc(doc(db, 'users', userId, 'notifications', notificationId), { read: true, readAt: serverTimestamp() });
}
