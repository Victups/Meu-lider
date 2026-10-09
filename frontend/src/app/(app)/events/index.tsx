import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, FAB } from 'react-native-paper';
import { format, isPast, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MonthCalendar } from '@/components/events/MonthCalendar';
import { Card, EmptyState, Screen, ViewToggle, type ViewOption } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { eventsService } from '@/services';
import { useAuthStore } from '@/stores/auth';
import { useChurchStore } from '@/stores/church';
import { fontFamily, fontSize, spacing } from '@/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import { useTabClearance } from '@/hooks/use-tab-clearance';
import type { Event } from '@/types';

type EventsView = 'list' | 'calendar';

const VIEWS: ViewOption<EventsView>[] = [
  { value: 'list', label: 'Lista', icon: 'list-outline' },
  { value: 'calendar', label: 'Calendário', icon: 'calendar-outline' },
];

export default function EventsScreen() {
  const theme = useAppTheme();
  const clearance = useTabClearance();
  const router = useRouter();
  const currentChurch = useChurchStore((s) => s.currentChurch);
  const canManage = useAuthStore((s) => s.canManageTeams);

  const [view, setView] = useState<EventsView>('list');
  const [month, setMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentChurch) {
      setLoading(false);
      return;
    }
    try {
      setError(null);
      setEvents(await eventsService.list(currentChurch.id));
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

  const openEvent = (id: string) =>
    router.push({ pathname: '/events/[eventId]', params: { eventId: id } });

  const eventsOfSelectedDay = useMemo(
    () => events.filter((event) => isSameDay(new Date(event.eventDate), selectedDate)),
    [events, selectedDate],
  );

  const renderEventCard = (item: Event, compact = false) => {
    const date = new Date(item.eventDate);
    const past = isPast(date);

    return (
      <Card key={item.id} onPress={() => openEvent(item.id)}>
        <View style={styles.row}>
          <View style={styles.info}>
            <Text style={[styles.name, { color: past ? theme.app.textMuted : theme.app.text }]}>
              {item.name}
            </Text>
            <Text style={[styles.date, { color: theme.app.textMuted }]}>
              {compact
                ? format(date, "HH'h'mm", { locale: ptBR })
                : format(date, "EEE, d MMM 'às' HH'h'mm", { locale: ptBR })}
            </Text>
            {item.location ? (
              <Text style={[styles.location, { color: theme.app.textSubtle }]}>
                {item.location}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.app.textSubtle} />
        </View>
      </Card>
    );
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

  const header = (
    <View style={styles.header}>
      <Text style={[styles.title, { color: theme.app.text }]}>Eventos</Text>
      {currentChurch ? (
        <Text style={[styles.subtitle, { color: theme.app.textMuted }]}>{currentChurch.name}</Text>
      ) : null}
      <View style={styles.toggle}>
        <ViewToggle options={VIEWS} value={view} onChange={setView} />
      </View>
    </View>
  );

  const emptyState = (
    <EmptyState
      icon={error ? 'cloud-offline-outline' : 'calendar-outline'}
      title={error ? 'Não foi possível carregar' : 'Nenhum evento criado'}
      description={error ?? 'Cultos, ensaios e reuniões aparecem aqui depois de criados.'}
      actionLabel={error ? 'Tentar de novo' : canManage() ? 'Criar evento' : undefined}
      onAction={error ? load : canManage() ? () => router.push('/events/new') : undefined}
    />
  );

  return (
    <Screen padded={false}>
      {view === 'list' ? (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          contentContainerStyle={[events.length === 0 ? styles.emptyList : styles.list, clearance > 0 && { paddingBottom: clearance + 72 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={emptyState}
          renderItem={({ item }) => renderEventCard(item)}
        />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.calendarContent, clearance > 0 && { paddingBottom: clearance + 72 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {header}

          <MonthCalendar
            month={month}
            onMonthChange={setMonth}
            selectedDate={selectedDate}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setMonth(date);
            }}
            events={events}
          />

          <View style={styles.dayBlock}>
            <Text style={[styles.dayTitle, { color: theme.app.text }]}>
              {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
            </Text>

            {eventsOfSelectedDay.length === 0 ? (
              <Text style={[styles.dayEmpty, { color: theme.app.textMuted }]}>
                Nenhum evento neste dia.
              </Text>
            ) : (
              eventsOfSelectedDay.map((item) => renderEventCard(item, true))
            )}
          </View>
        </ScrollView>
      )}

      {canManage() ? (
        <FAB icon="plus" style={[styles.fab, { bottom: clearance || spacing.lg }]} onPress={() => router.push('/events/new')} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: spacing.md, paddingBottom: spacing.lg },
  title: { fontFamily: fontFamily.display, fontSize: fontSize.xxl },
  subtitle: { fontFamily: fontFamily.body, fontSize: fontSize.sm, marginTop: 2 },
  toggle: { marginTop: spacing.lg },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 88, gap: spacing.md },
  emptyList: { flexGrow: 1, paddingHorizontal: spacing.lg },
  calendarContent: { paddingHorizontal: spacing.lg, paddingBottom: 88 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  info: { flex: 1, gap: 2 },
  name: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.md },
  date: { fontFamily: fontFamily.body, fontSize: fontSize.sm, textTransform: 'capitalize' },
  location: { fontFamily: fontFamily.body, fontSize: fontSize.xs },
  dayBlock: { marginTop: spacing.xl, gap: spacing.md },
  dayTitle: { fontFamily: fontFamily.displayMedium, fontSize: fontSize.lg },
  dayEmpty: { fontFamily: fontFamily.body, fontSize: fontSize.sm },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg },
});
