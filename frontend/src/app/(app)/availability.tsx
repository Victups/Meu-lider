import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActivityIndicator, Button, IconButton, Snackbar, TextInput } from 'react-native-paper';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';
import { DateTimeField } from '@/components/form';
import { Card, EmptyState, Screen, Sheet } from '@/components/ui';
import { useCurrentMember } from '@/hooks/use-current-member';
import { toUserMessage } from '@/lib/errors';
import { availabilityService } from '@/services';
import { fontFamily, fontSize, radius, spacing } from '@/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import { useTabClearance } from '@/hooks/use-tab-clearance';
import type { Availability } from '@/types';

const WEEKDAYS = [
  { value: 0, short: 'Dom' },
  { value: 1, short: 'Seg' },
  { value: 2, short: 'Ter' },
  { value: 3, short: 'Qua' },
  { value: 4, short: 'Qui' },
  { value: 5, short: 'Sex' },
  { value: 6, short: 'Sáb' },
];

const WEEKEND = [0, 6];
const WEEKDAYS_ONLY = [1, 2, 3, 4, 5];
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

function sameSet(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value) => b.includes(value));
}

function endOfToday(): Date {
  const date = new Date();
  date.setHours(23, 59, 0, 0);
  return date;
}

export default function AvailabilityScreen() {
  const theme = useAppTheme();
  const clearance = useTabClearance();
  const { member, loading: loadingMember } = useCurrentMember();

  const [available, setAvailable] = useState<number[]>(EVERY_DAY);
  const [absences, setAbsences] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState(new Date());
  const [dateTo, setDateTo] = useState(endOfToday);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!member) {
      setLoading(false);
      return;
    }
    try {
      const [weekdays, list] = await Promise.all([
        availabilityService.getWeekdays(member.id),
        availabilityService.listByMember(member.id),
      ]);
      setAvailable(weekdays.filter((day) => day.isAvailable).map((day) => day.weekday));
      setAbsences(list);
    } catch (err) {
      setToast(toUserMessage(err));
    } finally {
      setLoading(false);
    }
  }, [member]);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, [load]);

  // Saves on tap: a preference screen with a save button gets abandoned.
  const commitWeekdays = async (next: number[]) => {
    if (!member) return;
    const previous = available;
    setAvailable(next);
    Haptics.selectionAsync().catch(() => {});

    try {
      await availabilityService.setWeekdays(member.id, next);
    } catch (err) {
      setAvailable(previous);
      setToast(toUserMessage(err));
    }
  };

  const toggleDay = (weekday: number) => {
    const next = available.includes(weekday)
      ? available.filter((day) => day !== weekday)
      : [...available, weekday].sort();
    commitWeekdays(next);
  };

  const handleCreateAbsence = async () => {
    if (!member) return;
    if (dateTo < dateFrom) {
      setToast('A data final não pode ser antes da inicial');
      return;
    }

    setSaving(true);
    try {
      await availabilityService.create(member.id, {
        memberId: member.id,
        dateFrom: dateFrom.toISOString(),
        dateTo: dateTo.toISOString(),
        isAvailable: false,
        reason: reason.trim() || undefined,
      });
      setFormOpen(false);
      setReason('');
      setToast('Ausência registrada');
      await load();
    } catch (err) {
      setToast(toUserMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAbsence = async (id: string) => {
    if (!member) return;
    try {
      await availabilityService.remove(member.id, id);
      setAbsences((current) => current.filter((entry) => entry.id !== id));
    } catch (err) {
      setToast(toUserMessage(err));
    }
  };

  if (loadingMember || loading) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      </Screen>
    );
  }

  const presets = [
    { label: 'Todos os dias', days: EVERY_DAY },
    { label: 'Só fins de semana', days: WEEKEND },
    { label: 'Só dias de semana', days: WEEKDAYS_ONLY },
  ];

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={[styles.content, clearance > 0 && { paddingBottom: clearance + spacing.lg }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.app.text }]}>Disponibilidade</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.app.text }]}>
            Dias em que posso servir
          </Text>
          <Text style={[styles.hint, { color: theme.app.textMuted }]}>
            Vale para sempre. A escala automática só considera estes dias.
          </Text>

          <View style={styles.days}>
            {WEEKDAYS.map((day) => {
              const on = available.includes(day.value);
              return (
                <Pressable
                  key={day.value}
                  onPress={() => toggleDay(day.value)}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={day.short}
                  style={[
                    styles.day,
                    {
                      backgroundColor: on ? theme.colors.primary : theme.app.surfaceSunken,
                      borderColor: on ? theme.colors.primary : theme.app.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: on ? theme.colors.onPrimary : theme.app.textMuted },
                    ]}
                  >
                    {day.short}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.presets}>
            {presets.map((preset) => {
              const active = sameSet(preset.days, available);
              return (
                <Pressable
                  key={preset.label}
                  onPress={() => commitWeekdays(preset.days)}
                  style={[
                    styles.preset,
                    {
                      borderColor: active ? theme.colors.primary : theme.app.border,
                      backgroundColor: active ? theme.colors.primaryContainer : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.presetText,
                      { color: active ? theme.colors.onPrimaryContainer : theme.app.textMuted },
                    ]}
                  >
                    {preset.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {available.length === 0 ? (
            <Text style={[styles.warning, { color: theme.colors.error }]}>
              Sem nenhum dia marcado você não entra em escala nenhuma.
            </Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={[styles.sectionTitle, { color: theme.app.text }]}>Ausências</Text>
            <Button compact onPress={() => setFormOpen(true)}>
              Adicionar
            </Button>
          </View>
          <Text style={[styles.hint, { color: theme.app.textMuted }]}>
            Para datas específicas, como viagens e férias.
          </Text>

          {absences.length === 0 ? (
            <EmptyState
              icon="airplane-outline"
              title="Nenhuma ausência"
              description="Quando precisar faltar em datas específicas, registre aqui."
            />
          ) : (
            absences.map((entry) => (
              <Card key={entry.id} style={styles.absence}>
                <View style={styles.absenceRow}>
                  <View style={styles.absenceInfo}>
                    <Text style={[styles.period, { color: theme.app.text }]}>
                      {format(new Date(entry.dateFrom), "d 'de' MMM", { locale: ptBR })} até{' '}
                      {format(new Date(entry.dateTo), "d 'de' MMM", { locale: ptBR })}
                    </Text>
                    {entry.reason ? (
                      <Text style={[styles.reason, { color: theme.app.textMuted }]}>
                        {entry.reason}
                      </Text>
                    ) : null}
                  </View>
                  <IconButton
                    icon="trash-can-outline"
                    size={20}
                    iconColor={theme.colors.error}
                    onPress={() => handleRemoveAbsence(entry.id)}
                  />
                </View>
              </Card>
            ))
          )}
        </View>
      </ScrollView>

      <Sheet
        visible={formOpen}
        onDismiss={() => setFormOpen(false)}
        title="Não posso servir"
        subtitle="Para datas específicas — o padrão semanal fica acima"
        footer={
          <>
            <Button mode="outlined" onPress={() => setFormOpen(false)} style={styles.action}>
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleCreateAbsence}
              loading={saving}
              disabled={saving}
              style={styles.action}
            >
              Salvar
            </Button>
          </>
        }
      >
        <DateTimeField label="A partir de" value={dateFrom} onChange={setDateFrom} />
        <DateTimeField
          label="Até"
          value={dateTo}
          onChange={setDateTo}
          minimumDate={dateFrom}
          shortcuts={false}
        />
        <TextInput
          mode="outlined"
          label="Motivo (opcional)"
          placeholder="Viagem, trabalho..."
          value={reason}
          onChangeText={setReason}
          returnKeyType="done"
          onSubmitEditing={handleCreateAbsence}
        />
      </Sheet>

      <Snackbar wrapperStyle={{ bottom: clearance }} visible={toast !== null} onDismiss={() => setToast(null)} duration={2500}>
        {toast ?? ''}
      </Snackbar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xl },
  header: { paddingTop: spacing.md },
  title: { fontFamily: fontFamily.display, fontSize: fontSize.xxl },
  section: { gap: spacing.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: fontFamily.displayMedium, fontSize: fontSize.lg },
  hint: { fontFamily: fontFamily.body, fontSize: fontSize.sm, lineHeight: 20 },
  days: { flexDirection: 'row', gap: spacing.xs + 2, marginTop: spacing.sm },
  day: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  dayText: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.xs },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  preset: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  presetText: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs },
  warning: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, marginTop: spacing.sm },
  absence: { marginTop: spacing.sm },
  absenceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  absenceInfo: { flex: 1, gap: 2 },
  period: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.md },
  reason: { fontFamily: fontFamily.body, fontSize: fontSize.sm },
  action: { flex: 1, borderRadius: radius.md },
});
