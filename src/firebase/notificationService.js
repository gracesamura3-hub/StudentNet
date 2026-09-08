import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { arrayUnion, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
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
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (Platform.OS === 'web' || !db || !projectId) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('studentnet', {
      name: 'StudentNet activity',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const current = await Notifications.getPermissionsAsync();
  const permission = current.status === 'granted' ? current : await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') return null;

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await updateDoc(doc(db, 'users', userId), {
    expoPushTokens: arrayUnion(token),
    pushTokenUpdatedAt: serverTimestamp(),
  });
  return token;
}
