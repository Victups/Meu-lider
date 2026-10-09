import { useCallback, useState } from 'react';
import { ScrollView, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Button, Snackbar } from 'react-native-paper';
import { Card, EmptyState, Screen } from '@/components/ui';
import { formatWhen } from '@/lib/dates';
import { toUserMessage } from '@/lib/errors';
import { swapsService } from '@/services';
import { useChurchStore } from '@/stores/church';
import { fontFamily, fontSize, radius, spacing } from '@/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import { useTabClearance } from '@/hooks/use-tab-clearance';
import type { ID, MySwaps, Schedule, ScheduleSwap, SwapStatus } from '@/types';

const STATUS_LABEL: Record<SwapStatus, string> = {
  OPEN: 'Aguardando resposta',
  ACCEPTED: 'Aceita',
  DECLINED: 'Recusada',
  CANCELLED: 'Cancelada',
};

const describe = (schedule?: Schedule) =>
  schedule?.event ? `${schedule.event.name} · ${formatWhen(schedule.event.eventDate)}` : 'Escala';

export default function SwapsScreen() {
  const theme = useAppTheme();
  const clearance = useTabClearance();
  const currentChurch = useChurchStore((s) => s.currentChurch);

  const [swaps, setSwaps] = useState<MySwaps>({ incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<ID | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentChurch) return;
    try {
      setError(null);
      setSwaps(await swapsService.mine(currentChurch.id));
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setLoading(false);
    }
  }, [currentChurch]);

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

  const act = async (swap: ScheduleSwap, action: 'accept' | 'decline' | 'cancel', done: string) => {
    if (!currentChurch) return;
    setBusy(swap.id);
    try {
      await swapsService[action](currentChurch.id, swap.id);
      setToast(done);
      await load();
    } catch (err) {
      setToast(toUserMessage(err));
      await load();
    } finally {
      setBusy(null);
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

  const empty = swaps.incoming.length === 0 && swaps.outgoing.length === 0;

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={[styles.content, clearance > 0 && { paddingBottom: clearance + spacing.lg }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={[styles.title, { color: theme.app.text }]}>Trocas</Text>

        {empty ? (
          <EmptyState
            icon={error ? 'cloud-offline-outline' : 'swap-horizontal-outline'}
            title={error ? 'Não foi possível carregar' : 'Nenhuma troca por enquanto'}
            description={error ?? 'Combine com um colega e peça a troca em Minhas escalas → Trocar.'}
            actionLabel={error ? 'Tentar de novo' : undefined}
            onAction={error ? load : undefined}
          />
        ) : null}

        {swaps.incoming.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.app.text }]}>Para você responder</Text>
            {swaps.incoming.map((swap) => {
              const who = swap.requestedByMember?.fullName ?? 'Um colega';
              return (
                <Card key={swap.id}>
                  {swap.counterSchedule ? (
                    <>
                      <Text style={[styles.lead, { color: theme.app.text }]}>{who} quer trocar de dia com você</Text>
                      <Text style={[styles.line, { color: theme.app.textMuted }]}>
                        Você assume: {describe(swap.schedule)}
                      </Text>
                      <Text style={[styles.line, { color: theme.app.textMuted }]}>
                        Você passa: {describe(swap.counterSchedule)}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={[styles.lead, { color: theme.app.text }]}>
                        {who} {swap.targetMemberId ? 'pediu que você cubra' : 'procura alguém para cobrir'}
                      </Text>
                      <Text style={[styles.line, { color: theme.app.textMuted }]}>
                        {swap.schedule?.teamRole?.name ? `${swap.schedule.teamRole.name} · ` : ''}
                        {describe(swap.schedule)}
                      </Text>
                    </>
                  )}
                  {swap.reason ? (
                    <Text style={[styles.reason, { color: theme.app.textSubtle }]}>“{swap.reason}”</Text>
                  ) : null}
                  <View style={styles.actions}>
                    {swap.targetMemberId ? (
                      <Button
                        mode="outlined"
                        disabled={busy === swap.id}
                        onPress={() => act(swap, 'decline', 'Pedido recusado')}
                        style={styles.action}
                      >
                        Recusar
                      </Button>
                    ) : null}
                    <Button
                      mode="contained"
                      loading={busy === swap.id}
                      disabled={busy === swap.id}
                      onPress={() => act(swap, 'accept', 'Pronto! A escala foi atualizada')}
                      style={styles.action}
                    >
                      Aceitar
                    </Button>
                  </View>
                </Card>
              );
            })}
          </View>
        ) : null}

        {swaps.outgoing.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.app.text }]}>Que você pediu</Text>
            {swaps.outgoing.map((swap) => {
              const target = swap.targetMember?.fullName;
              return (
                <Card key={swap.id}>
                  <Text style={[styles.lead, { color: theme.app.text }]}>{describe(swap.schedule)}</Text>
                  <Text style={[styles.line, { color: theme.app.textMuted }]}>
                    {swap.counterSchedule
                      ? `Em troca de ${describe(swap.counterSchedule)}${target ? ` (${target})` : ''}`
                      : target
                        ? `Para ${target} cobrir`
                        : 'Aberto para a equipe'}
                  </Text>
                  <Text style={[styles.status, { color: theme.colors.primary }]}>{STATUS_LABEL[swap.status]}</Text>
                  {swap.status === 'OPEN' ? (
                    <Button
                      mode="outlined"
                      disabled={busy === swap.id}
                      onPress={() => act(swap, 'cancel', 'Pedido cancelado')}
                      style={styles.cancel}
                    >
                      Cancelar pedido
                    </Button>
                  ) : null}
                </Card>
              );
            })}
          </View>
        ) : null}
      </ScrollView>

      <Snackbar wrapperStyle={{ bottom: clearance }} visible={toast !== null} onDismiss={() => setToast(null)} duration={3000}>
        {toast ?? ''}
      </Snackbar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg, flexGrow: 1 },
  title: { fontFamily: fontFamily.display, fontSize: fontSize.xxl },
  section: { gap: spacing.md },
  sectionTitle: { fontFamily: fontFamily.displayMedium, fontSize: fontSize.lg },
  lead: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.md },
  line: { fontFamily: fontFamily.body, fontSize: fontSize.sm, marginTop: 2, lineHeight: 20 },
  reason: { fontFamily: fontFamily.body, fontSize: fontSize.sm, fontStyle: 'italic', marginTop: spacing.sm },
  status: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, marginTop: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  action: { flex: 1, borderRadius: radius.md },
  cancel: { marginTop: spacing.md, borderRadius: radius.md },
});
