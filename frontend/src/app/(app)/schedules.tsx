import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { ActivityIndicator, Button, Snackbar, TextInput } from 'react-native-paper';
import { ScheduleCard } from '@/components/schedules/ScheduleCard';
import { EmptyState, Screen, Sheet } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { membersService, schedulesService } from '@/services';
import { useAuthStore } from '@/stores/auth';
import { useChurchStore } from '@/stores/church';
import { fontFamily, fontSize, radius, spacing } from '@/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import { useTabClearance } from '@/hooks/use-tab-clearance';
import type { ID, Schedule } from '@/types';

export default function SchedulesScreen() {
  const theme = useAppTheme();
  const clearance = useTabClearance();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const currentChurch = useChurchStore((s) => s.currentChurch);

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingOn, setActingOn] = useState<ID | null>(null);
  const [releasing, setReleasing] = useState<Schedule | null>(null);
  const [reason, setReason] = useState('');
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

      const mine = await schedulesService.listByMember(currentChurch.id, me.id);
      // Cancelled rows are history; upcoming first so what matters is on top.
      const now = Date.now();
      const when = (s: Schedule) => new Date(s.event?.eventDate ?? 0).getTime();
      setSchedules(
        mine
          .filter((s) => s.status !== 'CANCELLED')
          .sort((a, b) => {
            const aPast = when(a) < now;
            const bPast = when(b) < now;
            if (aPast !== bPast) return aPast ? 1 : -1;
            return aPast ? when(b) - when(a) : when(a) - when(b);
          }),
      );
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

  const submitRelease = async () => {
    if (!currentChurch || !releasing) return;

    setActingOn(releasing.id);
    try {
      const updated = await schedulesService.requestRelease(
        currentChurch.id,
        releasing.id,
        reason.trim(),
      );

      setSchedules((current) => current.map((s) => (s.id === updated.id ? updated : s)));
      setReleasing(null);
      setReason('');
      setToast('Pedido enviado para a liderança');
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
        contentContainerStyle={[schedules.length === 0 ? styles.emptyList : styles.list, clearance > 0 && { paddingBottom: clearance + spacing.lg }]}
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
        renderItem={({ item, index }) => (
          <ScheduleCard
            schedule={item}
            index={index}
            busy={actingOn === item.id}
            onRequestSwap={() =>
              router.push({ pathname: '/swap-request', params: { scheduleId: item.id } } as unknown as Href)
            }
            onRequestRelease={() => {
              setReleasing(item);
              setReason('');
            }}
          />
        )}
      />

      <Sheet
        visible={releasing !== null}
        onDismiss={() => setReleasing(null)}
        title="Não vou poder servir"
        subtitle={releasing?.event?.name}
        footer={
          <>
            <Button mode="outlined" onPress={() => setReleasing(null)} style={styles.action}>
              Voltar
            </Button>
            <Button
              mode="contained"
              onPress={submitRelease}
              loading={actingOn !== null}
              disabled={reason.trim().length < 3 || actingOn !== null}
              style={styles.action}
            >
              Enviar pedido
            </Button>
          </>
        }
      >
        <Text style={[styles.sheetHint, { color: theme.app.textMuted }]}>
          Você continua escalado até a liderança liberar. Quem entra no seu lugar é escolhido
          automaticamente.
        </Text>
        <TextInput
          mode="outlined"
          label="Motivo"
          placeholder="Viagem, trabalho, saúde..."
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={3}
          autoFocus
        />
      </Sheet>

      <Snackbar wrapperStyle={{ bottom: clearance }} visible={toast !== null} onDismiss={() => setToast(null)} duration={3000}>
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
  action: { flex: 1, borderRadius: radius.md },
  sheetHint: { fontFamily: fontFamily.body, fontSize: fontSize.sm, lineHeight: 20 },
});
