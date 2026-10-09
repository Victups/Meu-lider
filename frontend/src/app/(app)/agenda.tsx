import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Button, FAB, Snackbar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, EmptyState, Screen, Sheet } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { describeRecurrence, parseRecurrenceRule } from '@/lib/recurrence';
import { eventsService } from '@/services';
import { useAuthStore } from '@/stores/auth';
import { useChurchStore } from '@/stores/church';
import { fontFamily, fontSize, radius, spacing } from '@/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import { useTabClearance } from '@/hooks/use-tab-clearance';
import type { Event } from '@/types';

export default function AgendaFixaScreen() {
  const theme = useAppTheme();
  const clearance = useTabClearance();
  const router = useRouter();
  const currentChurch = useChurchStore((s) => s.currentChurch);
  const isAdmin = useAuthStore((s) => s.isAdmin);

  const [templates, setTemplates] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [removing, setRemoving] = useState<Event | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [materializing, setMaterializing] = useState(false);

  const canEdit = isAdmin();

  const load = useCallback(async () => {
    if (!currentChurch) return;
    try {
      setError(null);
      const all = await eventsService.list(currentChurch.id);
      const recurring = all
        .filter((e) => e.recurrenceRule)
        .sort((a, b) => {
          const dayA = new Date(a.eventDate).getDay();
          const dayB = new Date(b.eventDate).getDay();
          if (dayA !== dayB) return dayA - dayB;
          return a.eventDate.localeCompare(b.eventDate);
        });
      setTemplates(recurring);
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

  const handleDelete = async () => {
    if (!currentChurch || !removing) return;
    setDeleting(true);
    try {
      await eventsService.remove(currentChurch.id, removing.id);
      setRemoving(null);
      setToast(`"${removing.name}" removido da agenda`);
      await load();
    } catch (err) {
      setToast(toUserMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const handleMaterializeMonth = async () => {
    if (!currentChurch) return;
    setMaterializing(true);
    try {
      const results = await eventsService.materializeMonth(currentChurch.id);
      const total = results.reduce((sum, r) => sum + r.createdCount, 0);
      setToast(total > 0 ? `${total} datas criadas e escaladas!` : 'Todas as datas do próximo mês já existem.');
    } catch (err) {
      setToast(toUserMessage(err));
    } finally {
      setMaterializing(false);
    }
  };

  const describeTime = (event: Event) => {
    const date = new Date(event.eventDate);
    return format(date, "HH'h'mm", { locale: ptBR });
  };

  const describeRule = (event: Event) => {
    if (!event.recurrenceRule) return '';
    const weekday = new Date(event.eventDate).getDay();
    return describeRecurrence(parseRecurrenceRule(event.recurrenceRule, weekday));
  };

  const weekdayLabel = (event: Event) => {
    return format(new Date(event.eventDate), 'EEEE', { locale: ptBR });
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

  if (error) {
    return (
      <Screen>
        <EmptyState
          icon="cloud-offline-outline"
          title="Não foi possível carregar"
          description={error}
          actionLabel="Tentar de novo"
          onAction={load}
        />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <FlatList
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        data={templates}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, clearance > 0 && { paddingBottom: clearance + 72 }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.app.text }]}>Agenda Fixa</Text>
            <Text style={[styles.subtitle, { color: theme.app.textMuted }]}>
              Eventos que se repetem toda semana ou todo mês.{'\n'}
              Toque em um evento para gerar datas individualmente.
            </Text>
            {canEdit && templates.length > 0 ? (
              <Button
                mode="contained"
                icon="calendar-month"
                onPress={handleMaterializeMonth}
                loading={materializing}
                disabled={materializing}
                style={styles.monthBtn}
              >
                Gerar próximo mês
              </Button>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="Nenhum evento recorrente"
            description={
              canEdit
                ? 'Crie os cultos e reuniões fixas da igreja.'
                : 'A administração ainda não configurou a agenda.'
            }
            actionLabel={canEdit ? 'Criar evento' : undefined}
            onAction={canEdit ? () => router.push('/events/new') : undefined}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/events/${item.id}`)}
            onLongPress={canEdit ? () => setRemoving(item) : undefined}
          >
            <Card>
              <View style={styles.cardRow}>
                <View style={[styles.timeBox, { backgroundColor: theme.colors.primaryContainer }]}>
                  <Text style={[styles.timeText, { color: theme.colors.onPrimaryContainer }]}>
                    {describeTime(item)}
                  </Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.eventName, { color: theme.app.text }]}>{item.name}</Text>
                  <View style={styles.metaRow}>
                    <Ionicons name="repeat" size={14} color={theme.app.textMuted} />
                    <Text style={[styles.metaText, { color: theme.app.textMuted }]}>
                      {describeRule(item)}
                    </Text>
                  </View>
                  {item.teams && item.teams.length > 0 ? (
                    <View style={styles.metaRow}>
                      <Ionicons name="people-outline" size={14} color={theme.app.textSubtle} />
                      <Text style={[styles.metaText, { color: theme.app.textSubtle }]}>
                        {item.teams.map((t) => t.team?.name ?? 'Equipe').join(', ')}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.app.textSubtle} />
              </View>
            </Card>
          </Pressable>
        )}
      />

      {canEdit ? (
        <FAB
          icon="plus"
          style={[styles.fab, { bottom: clearance || spacing.lg }]}
          onPress={() => router.push('/events/new')}
        />
      ) : null}

      <Sheet
        visible={removing !== null}
        onDismiss={() => setRemoving(null)}
        title="Remover da agenda fixa?"
        subtitle={`"${removing?.name ?? ''}" e todas as datas já geradas serão removidos.`}
        footer={
          <>
            <Button mode="outlined" onPress={() => setRemoving(null)} style={styles.action}>
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleDelete}
              loading={deleting}
              disabled={deleting}
              buttonColor={theme.colors.error}
              style={styles.action}
            >
              Remover
            </Button>
          </>
        }
      >
        <View />
      </Sheet>

      <Snackbar wrapperStyle={{ bottom: clearance }} visible={toast !== null} onDismiss={() => setToast(null)} duration={3000}>
        {toast ?? ''}
      </Snackbar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 88, gap: spacing.md },
  header: { paddingTop: spacing.lg, paddingBottom: spacing.sm, gap: spacing.xs },
  title: { fontFamily: fontFamily.display, fontSize: fontSize.xxl },
  subtitle: { fontFamily: fontFamily.body, fontSize: fontSize.sm, lineHeight: 20 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  timeBox: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    alignItems: 'center',
    minWidth: 52,
  },
  timeText: { fontFamily: fontFamily.displayMedium, fontSize: fontSize.sm },
  cardInfo: { flex: 1, gap: 2 },
  eventName: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.md },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { fontFamily: fontFamily.body, fontSize: fontSize.xs },
  monthBtn: { borderRadius: radius.md, marginTop: spacing.sm },
  action: { flex: 1, borderRadius: radius.md },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg },
});
