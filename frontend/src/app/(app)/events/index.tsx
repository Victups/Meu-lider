import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, FAB } from 'react-native-paper';
import { format, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, EmptyState, Screen } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { eventsService } from '@/services';
import { useAuthStore } from '@/stores/auth';
import { useChurchStore } from '@/stores/church';
import { fontFamily, fontSize, spacing } from '@/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import type { Event } from '@/types';

export default function EventsScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const currentChurch = useChurchStore((s) => s.currentChurch);
  const canManage = useAuthStore((s) => s.canManageTeams);

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

  // Refetch on focus so a newly created event shows up on the way back.
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
        <Text style={[styles.title, { color: theme.app.text }]}>Eventos</Text>
        {currentChurch ? (
          <Text style={[styles.subtitle, { color: theme.app.textMuted }]}>{currentChurch.name}</Text>
        ) : null}
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={events.length === 0 ? styles.emptyList : styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState
            icon={error ? 'cloud-offline-outline' : 'calendar-outline'}
            title={error ? 'Não foi possível carregar' : 'Nenhum evento criado'}
            description={
              error ?? 'Cultos, ensaios e reuniões aparecem aqui depois de criados.'
            }
            actionLabel={error ? 'Tentar de novo' : canManage() ? 'Criar evento' : undefined}
            onAction={error ? load : canManage() ? () => router.push('/events/new') : undefined}
          />
        }
        renderItem={({ item }) => {
          const date = new Date(item.eventDate);
          const past = isPast(date);

          return (
            <Card
              onPress={() =>
                router.push({ pathname: '/events/[eventId]', params: { eventId: item.id } })
              }
            >
              <View style={styles.row}>
                <View style={styles.info}>
                  <Text
                    style={[styles.name, { color: past ? theme.app.textMuted : theme.app.text }]}
                  >
                    {item.name}
                  </Text>
                  <Text style={[styles.date, { color: theme.app.textMuted }]}>
                    {format(date, "EEE, d MMM 'às' HH'h'mm", { locale: ptBR })}
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
        }}
      />

      {canManage() ? (
        <FAB icon="plus" style={styles.fab} onPress={() => router.push('/events/new')} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg },
  title: { fontFamily: fontFamily.display, fontSize: fontSize.xxl },
  subtitle: { fontFamily: fontFamily.body, fontSize: fontSize.sm, marginTop: 2 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 88, gap: spacing.md },
  emptyList: { flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  info: { flex: 1, gap: 2 },
  name: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.md },
  date: { fontFamily: fontFamily.body, fontSize: fontSize.sm, textTransform: 'capitalize' },
  location: { fontFamily: fontFamily.body, fontSize: fontSize.xs },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg },
});
