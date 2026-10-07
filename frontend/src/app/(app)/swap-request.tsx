import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Button, SegmentedButtons, Snackbar, TextInput } from 'react-native-paper';
import { Avatar, Card, EmptyState, Screen } from '@/components/ui';
import { formatWhen } from '@/lib/dates';
import { toUserMessage } from '@/lib/errors';
import { schedulesService, swapsService } from '@/services';
import { useChurchStore } from '@/stores/church';
import { fontFamily, fontSize, radius, spacing } from '@/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import type { ID, Schedule, SwapCandidateMember } from '@/types';

type Mode = 'exchange' | 'handover';

/** Member-to-member: trade dates with a colleague, or hand the slot over. No leader in the middle. */
export default function SwapRequestScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { scheduleId } = useLocalSearchParams<{ scheduleId: string }>();
  const currentChurch = useChurchStore((s) => s.currentChurch);

  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [exchange, setExchange] = useState<Schedule[]>([]);
  const [handover, setHandover] = useState<SwapCandidateMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode>('exchange');
  const [pickedSchedule, setPickedSchedule] = useState<ID | null>(null);
  const [pickedMember, setPickedMember] = useState<ID | null>(null);
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!currentChurch || !scheduleId) return;

    Promise.all([
      schedulesService.getById(currentChurch.id, scheduleId),
      swapsService.exchangeCandidates(currentChurch.id, scheduleId),
      swapsService.handoverCandidates(currentChurch.id, scheduleId),
    ])
      .then(([mine, days, members]) => {
        setSchedule(mine);
        setExchange(days);
        setHandover(members);
        if (days.length === 0 && members.length > 0) setMode('handover');
      })
      .catch((err) => setError(toUserMessage(err)))
      .finally(() => setLoading(false));
  }, [currentChurch, scheduleId]);

  const send = async (openToTeam = false) => {
    if (!currentChurch || !scheduleId) return;
    setSending(true);
    try {
      await swapsService.request(currentChurch.id, {
        scheduleId,
        counterScheduleId: !openToTeam && mode === 'exchange' ? (pickedSchedule ?? undefined) : undefined,
        targetMemberId: !openToTeam && mode === 'handover' ? (pickedMember ?? undefined) : undefined,
        reason: reason.trim() || undefined,
      });
      router.replace('/swaps' as never);
    } catch (err) {
      setToast(toUserMessage(err));
    } finally {
      setSending(false);
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

  if (error || !schedule) {
    return (
      <Screen>
        <EmptyState icon="cloud-offline-outline" title="Não foi possível carregar" description={error ?? undefined} />
      </Screen>
    );
  }

  const canSend = mode === 'exchange' ? pickedSchedule !== null : pickedMember !== null;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: theme.app.text }]}>Pedir troca</Text>
        <Text style={[styles.subtitle, { color: theme.app.textMuted }]}>
          {schedule.event?.name} · {schedule.event ? formatWhen(schedule.event.eventDate) : ''}
          {'\n'}
          {schedule.teamRole?.name} · {schedule.team?.name}
        </Text>

        <SegmentedButtons
          value={mode}
          onValueChange={(value) => setMode(value as Mode)}
          buttons={[
            { value: 'exchange', label: 'Trocar de dia', icon: 'swap-horizontal' },
            { value: 'handover', label: 'Passar a vaga', icon: 'account-arrow-right' },
          ]}
        />

        {mode === 'exchange' ? (
          exchange.length === 0 ? (
            <Text style={[styles.hint, { color: theme.app.textSubtle }]}>
              Nenhum colega da sua função tem uma data que dê certo para os dois. Tente passar a vaga.
            </Text>
          ) : (
            <View style={styles.list}>
              <Text style={[styles.hint, { color: theme.app.textMuted }]}>
                Você fica com a data do colega e ele(a) fica com a sua. Só aparecem datas em que os dois podem servir.
              </Text>
              {exchange.map((item) => (
                <Pressable key={item.id} onPress={() => setPickedSchedule(item.id)}>
                  <Card style={pickedSchedule === item.id ? { borderColor: theme.colors.primary, borderWidth: 2 } : undefined}>
                    <View style={styles.row}>
                      <Avatar name={item.member?.fullName ?? '?'} size={40} />
                      <View style={styles.info}>
                        <Text style={[styles.name, { color: theme.app.text }]}>{item.member?.fullName}</Text>
                        <Text style={[styles.line, { color: theme.app.textMuted }]}>
                          {item.event?.name} · {item.event ? formatWhen(item.event.eventDate) : ''}
                        </Text>
                      </View>
                      {pickedSchedule === item.id ? (
                        <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} />
                      ) : null}
                    </View>
                  </Card>
                </Pressable>
              ))}
            </View>
          )
        ) : handover.length === 0 ? (
          <Text style={[styles.hint, { color: theme.app.textSubtle }]}>
            Ninguém da equipe pode cobrir esta data agora. Você pode abrir o pedido para toda a equipe.
          </Text>
        ) : (
          <View style={styles.list}>
            <Text style={[styles.hint, { color: theme.app.textMuted }]}>
              Escolha quem vai cobrir você. Só aparece quem cobre a função e está livre nessa data.
            </Text>
            {handover.map((item) => (
              <Pressable key={item.memberId} onPress={() => setPickedMember(item.memberId)}>
                <Card style={pickedMember === item.memberId ? { borderColor: theme.colors.primary, borderWidth: 2 } : undefined}>
                  <View style={styles.row}>
                    <Avatar name={item.fullName} size={40} />
                    <Text style={[styles.name, styles.info, { color: theme.app.text }]}>{item.fullName}</Text>
                    {pickedMember === item.memberId ? (
                      <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} />
                    ) : null}
                  </View>
                </Card>
              </Pressable>
            ))}
          </View>
        )}

        <TextInput
          mode="outlined"
          label="Recado (opcional)"
          value={reason}
          onChangeText={setReason}
          multiline
        />

        <Button
          mode="contained"
          onPress={() => send()}
          loading={sending}
          disabled={!canSend || sending}
          style={styles.button}
        >
          {mode === 'exchange' ? 'Propor troca' : 'Pedir para cobrir'}
        </Button>

        {mode === 'handover' ? (
          <Button mode="outlined" onPress={() => send(true)} disabled={sending} style={styles.button}>
            Abrir para toda a equipe
          </Button>
        ) : null}
      </ScrollView>

      <Snackbar visible={toast !== null} onDismiss={() => setToast(null)} duration={4000}>
        {toast ?? ''}
      </Snackbar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg },
  title: { fontFamily: fontFamily.display, fontSize: fontSize.xxl },
  subtitle: { fontFamily: fontFamily.body, fontSize: fontSize.sm, lineHeight: 20 },
  hint: { fontFamily: fontFamily.body, fontSize: fontSize.sm, lineHeight: 20 },
  list: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  info: { flex: 1, gap: 2 },
  name: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.md },
  line: { fontFamily: fontFamily.body, fontSize: fontSize.sm },
  button: { borderRadius: radius.md },
});
