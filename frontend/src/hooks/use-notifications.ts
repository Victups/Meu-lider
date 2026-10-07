import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { notificationsService } from '@/services';
import { useAuthStore } from '@/stores/auth';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Padrão',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: projectId as string,
  });

  return tokenData.data;
}

export function useNotifications() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!user || registeredRef.current) return;

    getExpoPushToken().then((token) => {
      if (token) {
        notificationsService.registerPushToken(token).catch(() => {});
        registeredRef.current = true;
      }
    });
  }, [user]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.screen === 'event' && data?.eventId) {
        router.push(`/(app)/events/${data.eventId}`);
      }
    });

    return () => sub.remove();
  }, [router]);
}
