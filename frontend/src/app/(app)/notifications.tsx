import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Button, Snackbar } from 'react-native-paper';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, EmptyState, Screen } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { notificationRoute } from '@/lib/notification-route';
import { notificationsService } from '@/services';
import { useNotificationsStore } from '@/stores/notifications';
import { fontFamily, fontSize, radius, spacing } from '@/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import type { Notification, NotificationType } from '@/types';

type IconName = keyof typeof Ionicons.glyphMap;

const ICONS: Record<NotificationType, IconName> = {
  SCHEDULE_ASSIGNED: 'person-add-outline',
  SCHEDULE_CHANGED: 'create-outline',
  CONFIRMATION_REQUESTED: 'checkmark-circle-outline',
  SCHEDULE_CANCELLED: 'close-circle-outline',
  SCHEDULE_REMINDER: 'alarm-outline',
  AVAILABILITY_REMINDER: 'calendar-outline',
  EVENT_CREATED: 'megaphone-outline',
  RELEASE_REQUESTED: 'hand-left-outline',
  SWAP_REQUESTED: 'swap-horizontal-outline',
  SWAP_RESPONDED: 'swap-horizontal-outline',
};

export default function NotificationsScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const setUnread = useNotificationsStore((s) => s.setUnread);

  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const list = await notificationsService.list();
      setItems(list);
      setUnread(list.filter((n) => !n.isRead).length);
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setLoading(false);
    }
  }, [setUnread]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const open = async (item: Notification) => {
    if (!item.isRead) {
      setItems((current) => current.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
      setUnread(items.filter((n) => !n.isRead && n.id !== item.id).length);
      notificationsService.markAsRead(item.id).catch(() => undefined);
    }
    router.push(notificationRoute(item.type, item.relatedEventId));
  };

  const markAll = async () => {
    try {
      await notificationsService.markAllAsRead();
      setItems((current) => current.map((n) => ({ ...n, isRead: true })));
      setUnread(0);
    } catch (err) {
      setToast(toUserMessage(err));
    }
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      </Screen>
    );
  }

  const hasUnread = items.some((n) => !n.isRead);

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.app.text }]}>Notificações</Text>
        {hasUnread ? (
          <Button compact onPress={markAll}>
            Marcar todas como lidas
          </Button>
        ) : null}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={items.length === 0 ? styles.emptyList : styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState
            icon={error ? 'cloud-offline-outline' : 'notifications-off-outline'}
            title={error ? 'Não foi possível carregar' : 'Nada por aqui'}
            description={error ?? 'Avisos de escala, lembretes e pedidos de troca aparecem aqui.'}
            actionLabel={error ? 'Tentar de novo' : undefined}
            onAction={error ? load : undefined}
          />
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => open(item)}>
            <Card>
              <View style={styles.row}>
                <View
                  style={[
                    styles.icon,
                    { backgroundColor: item.isRead ? theme.app.surfaceSunken : theme.colors.primaryContainer },
                  ]}
                >
                  <Ionicons
                    name={ICONS[item.type] ?? 'notifications-outline'}
                    size={20}
                    color={item.isRead ? theme.app.textMuted : theme.colors.onPrimaryContainer}
                  />
                </View>
                <View style={styles.body}>
                  <View style={styles.titleRow}>
                    <Text
                      numberOfLines={1}
                      style={[styles.itemTitle, { color: theme.app.text, fontFamily: item.isRead ? fontFamily.bodyMedium : fontFamily.bodyBold }]}
                    >
                      {item.title}
                    </Text>
                    {!item.isRead ? <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} /> : null}
                  </View>
                  <Text style={[styles.message, { color: theme.app.textMuted }]}>{item.message}</Text>
                  <Text style={[styles.time, { color: theme.app.textSubtle }]}>
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: ptBR })}
                  </Text>
                </View>
              </View>
            </Card>
          </Pressable>
        )}
      />

      <Snackbar visible={toast !== null} onDismiss={() => setToast(null)} duration={3000}>
        {toast ?? ''}
      </Snackbar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  title: { fontFamily: fontFamily.display, fontSize: fontSize.xxl },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  emptyList: { flexGrow: 1 },
  row: { flexDirection: 'row', gap: spacing.md },
  icon: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemTitle: { flex: 1, fontSize: fontSize.md },
  dot: { width: 8, height: 8, borderRadius: 4 },
  message: { fontFamily: fontFamily.body, fontSize: fontSize.sm, lineHeight: 20 },
  time: { fontFamily: fontFamily.body, fontSize: fontSize.xs, marginTop: 2 },
});
