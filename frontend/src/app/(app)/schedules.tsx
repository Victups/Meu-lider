import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { ActivityIndicator, Snackbar } from 'react-native-paper';
import { ScheduleCard } from '@/components/schedules/ScheduleCard';
import { EmptyState, Screen } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { membersService, schedulesService } from '@/services';
import { useAuthStore } from '@/stores/auth';
import { useChurchStore } from '@/stores/church';
import { fontFamily, fontSize, spacing } from '@/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import type { ID, Schedule } from '@/types';

export default function SchedulesScreen() {
  const theme = useAppTheme();
  const user = useAuthStore((s) => s.user);
  const currentChurch = useChurchStore((s) => s.currentChurch);

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingOn, setActingOn] = useState<ID | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentChurch || !user) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      // The API has no "my schedules" route yet, so the member row is resolved
      // from the church roster by user id.
      const roster = await membersService.list(currentChurch.id);
      const me = roster.find((member) => member.userId === user.id);

      if (!me) {
        setSchedules([]);
        return;
      }

      setSchedules(await schedulesService.listByMember(currentChurch.id, me.id));
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setLoading(false);
    }
  }, [currentChurch, user]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const respond = async (schedule: Schedule, confirm: boolean) => {
    if (!currentChurch) return;
    setActingOn(schedule.id);
    try {
      const updated = confirm
        ? await schedulesService.confirm(currentChurch.id, schedule.id)
        : await schedulesService.decline(currentChurch.id, schedule.id);

      setSchedules((current) => current.map((s) => (s.id === updated.id ? updated : s)));
      setToast(confirm ? 'Presença confirmada' : 'Avisamos a liderança');
    } catch (err) {
      setToast(toUserMessage(err));
    } finally {
      setActingOn(null);
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

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.app.text }]}>Minhas escalas</Text>
        {currentChurch ? (
          <Text style={[styles.subtitle, { color: theme.app.textMuted }]}>{currentChurch.name}</Text>
        ) : null}
      </View>

      <FlatList
        data={schedules}
        keyExtractor={(item) => item.id}
        contentContainerStyle={schedules.length === 0 ? styles.emptyList : styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState
            icon={error ? 'cloud-offline-outline' : 'calendar-outline'}
            title={error ? 'Não foi possível carregar' : 'Nenhuma escala por enquanto'}
            description={
              error ?? 'Quando a liderança escalar você em um evento, ele aparece aqui.'
            }
            actionLabel={error ? 'Tentar de novo' : undefined}
            onAction={error ? load : undefined}
          />
        }
        renderItem={({ item }) => (
          <ScheduleCard
            schedule={item}
            busy={actingOn === item.id}
            onConfirm={() => respond(item, true)}
            onDecline={() => respond(item, false)}
          />
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
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg },
  title: { fontFamily: fontFamily.display, fontSize: fontSize.xxl },
  subtitle: { fontFamily: fontFamily.body, fontSize: fontSize.sm, marginTop: 2 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  emptyList: { flexGrow: 1 },
});
