import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import type { NotificationResponse } from 'expo-notifications';
import { useRouter } from 'expo-router';
import { notificationRoute } from '@/lib/notification-route';
import { notificationsService } from '@/services';
import { useAuthStore } from '@/stores/auth';
import { useNotificationsStore } from '@/stores/notifications';

/**
 * Expo Go (Android) throws as soon as expo-notifications is imported, so the module is only
 * loaded in real builds (APK, development build). Inside Expo Go and on the web the push
 * features simply stay off; the in-app inbox keeps working.
 */
const canPush =
  Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

const Notifications: typeof import('expo-notifications') | null = canPush
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('expo-notifications')
  : null;

Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Asks for permission (iOS/Android show their own dialog) and returns the Expo push token. */
async function getExpoPushToken(): Promise<string | null> {
  if (!Notifications || !Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  const status =
    existing === 'granted' ? existing : (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Padrão',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

/**
 * Wires push for the signed-in user: registers this device (again whenever the
 * account changes), keeps the unread badge fresh and opens the right screen when
 * a notification is tapped.
 */
export function useNotifications() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const refreshUnread = useNotificationsStore((s) => s.refresh);

  useEffect(() => {
    if (!userId) return;

    refreshUnread();
    getExpoPushToken()
      .then((token) => (token ? notificationsService.registerPushToken(token) : undefined))
      .catch(() => undefined);
  }, [userId, refreshUnread]);

  useEffect(() => {
    if (!Notifications || !userId) return;

    const open = (response: NotificationResponse) => {
      const data = response.notification.request.content.data as
        | { type?: string; eventId?: string }
        | undefined;
      router.push(notificationRoute(data?.type, data?.eventId));
    };

    // Opened the app from a tap while it was closed.
    Notifications.getLastNotificationResponseAsync().then((last) => last && open(last));

    const tapped = Notifications.addNotificationResponseReceivedListener(open);
    const received = Notifications.addNotificationReceivedListener(() => refreshUnread());

    return () => {
      tapped.remove();
      received.remove();
    };
  }, [userId, router, refreshUnread]);
}
