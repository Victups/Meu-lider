import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { ActivityIndicator, Button, FAB, IconButton, Snackbar, TextInput } from 'react-native-paper';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateTimeField } from '@/components/form';
import { Card, EmptyState, Screen, Sheet } from '@/components/ui';
import { useCurrentMember } from '@/hooks/use-current-member';
import { toUserMessage } from '@/lib/errors';
import { availabilityService } from '@/services';
import { fontFamily, fontSize, radius, spacing } from '@/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import type { Availability } from '@/types';

function endOfToday(): Date {
  const date = new Date();
  date.setHours(23, 59, 0, 0);
  return date;
}

export default function AvailabilityScreen() {
  const theme = useAppTheme();
  const { member, loading: loadingMember } = useCurrentMember();

  const [periods, setPeriods] = useState<Availability[]>([]);
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
      setPeriods(await availabilityService.listByMember(member.id));
    } catch (err) {
      setToast(toUserMessage(err));
    } finally {
      setLoading(false);
    }
  }, [member]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
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
      setToast('Período registrado');
      await load();
    } catch (err) {
      setToast(toUserMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!member) return;
    try {
      await availabilityService.remove(member.id, id);
      setPeriods((current) => current.filter((entry) => entry.id !== id));
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

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.app.text }]}>Disponibilidade</Text>
        <Text style={[styles.subtitle, { color: theme.app.textMuted }]}>
          Marque os períodos em que você não pode servir. A escala automática respeita isso.
        </Text>
      </View>

      <FlatList
        data={periods}
        keyExtractor={(item) => item.id}
        contentContainerStyle={periods.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="Agenda livre"
            description="Enquanto não houver bloqueios, você entra normalmente no rodízio das escalas."
            actionLabel="Marcar ausência"
            onAction={() => setFormOpen(true)}
          />
        }
        renderItem={({ item }) => (
          <Card>
            <View style={styles.row}>
              <View style={styles.info}>
                <Text style={[styles.period, { color: theme.app.text }]}>
                  {format(new Date(item.dateFrom), "d 'de' MMM", { locale: ptBR })} até{' '}
                  {format(new Date(item.dateTo), "d 'de' MMM", { locale: ptBR })}
                </Text>
                {item.reason ? (
                  <Text style={[styles.reason, { color: theme.app.textMuted }]}>{item.reason}</Text>
                ) : null}
              </View>
              <IconButton
                icon="trash-can-outline"
                size={20}
                iconColor={theme.colors.error}
                onPress={() => handleRemove(item.id)}
              />
            </View>
          </Card>
        )}
      />

      <FAB icon="plus" style={styles.fab} onPress={() => setFormOpen(true)} />

      <Sheet
        visible={formOpen}
        onDismiss={() => setFormOpen(false)}
        title="Não posso servir"
        subtitle="A escala automática pula você nesse período"
        footer={
          <>
            <Button
              mode="outlined"
              onPress={() => setFormOpen(false)}
              style={styles.sheetAction}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleCreate}
              loading={saving}
              disabled={saving}
              style={styles.sheetAction}
            >
              Salvar
            </Button>
          </>
        }
      >
        <DateTimeField label="A partir de" value={dateFrom} onChange={setDateFrom} />
        <DateTimeField label="Até" value={dateTo} onChange={setDateTo} minimumDate={dateFrom} />
        <TextInput
          mode="outlined"
          label="Motivo (opcional)"
          placeholder="Viagem, trabalho..."
          value={reason}
          onChangeText={setReason}
        />
      </Sheet>

      <Snackbar visible={toast !== null} onDismiss={() => setToast(null)} duration={3000}>
        {toast ?? ''}
      </Snackbar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg, gap: spacing.xs },
  title: { fontFamily: fontFamily.display, fontSize: fontSize.xxl },
  subtitle: { fontFamily: fontFamily.body, fontSize: fontSize.sm, lineHeight: 20 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 88, gap: spacing.md },
  emptyList: { flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  info: { flex: 1, gap: 2 },
  period: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.md },
  reason: { fontFamily: fontFamily.body, fontSize: fontSize.sm },
  sheetAction: { flex: 1, borderRadius: radius.md },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg },
});
