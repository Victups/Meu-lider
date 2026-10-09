import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Snackbar } from 'react-native-paper';
import { ShareScheduleSheet } from '@/components/schedules/ShareScheduleSheet';
import { Card, EmptyState, Screen } from '@/components/ui';
import { formatWhen } from '@/lib/dates';
import { holdsSlot } from '@/lib/schedule';
import { toUserMessage } from '@/lib/errors';
import { eventsService, membersService, schedulesService, swapsService, teamsService } from '@/services';
import { useAuthStore } from '@/stores/auth';
import { useChurchStore } from '@/stores/church';
import { useNotificationsStore } from '@/stores/notifications';
import { fontFamily, fontSize, radius, spacing } from '@/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import { useTabClearance } from '@/hooks/use-tab-clearance';
import { canManageSomeTeam, canSeeAllRosters, type Schedule, type Team } from '@/types';

type IconName = keyof typeof Ionicons.glyphMap;

const NEXT_SCHEDULES = 3;
const EVENTS_AHEAD_DAYS = 60;

interface Summary {
  upcoming: Schedule[];
  pendingSwaps: number;
  /** Events in the coming weeks that none of my teams is attached to yet. */
  eventsWaitingTeam: number;
  ledTeams: Team[];
}

const EMPTY: Summary = { upcoming: [], pendingSwaps: 0, eventsWaitingTeam: 0, ledTeams: [] };

function Shortcut({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const theme = useAppTheme();

  return (
    <Pressable onPress={onPress} style={[styles.shortcut, { backgroundColor: theme.app.surface, borderColor: theme.app.border }]}>
      <Ionicons name={icon} size={22} color={theme.colors.primary} />
      <Text style={[styles.shortcutLabel, { color: theme.app.text }]}>{label}</Text>
    </Pressable>
  );
}

/** The member's day-to-day: what is next, what needs an answer, and the leader's shortcuts. */
export default function HomeScreen() {
  const theme = useAppTheme();
  const clearance = useTabClearance();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const currentChurch = useChurchStore((s) => s.currentChurch);
  const unread = useNotificationsStore((s) => s.unread);
  const refreshUnread = useNotificationsStore((s) => s.refresh);

  const [summary, setSummary] = useState<Summary>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const isLeader = user ? canManageSomeTeam(user.role) : false;
  const canSeeReports = user ? isLeader || canSeeAllRosters(user.role) : false;

  const load = useCallback(async () => {
    try {
      setError(null);
      await refreshUser();
      if (!useChurchStore.getState().currentChurch) await useChurchStore.getState().loadChurches();
      const church = useChurchStore.getState().currentChurch;
      const me = useAuthStore.getState().user;
      if (!church || !me) return;

      refreshUnread();

      const roster = await membersService.list(church.id);
      const member = roster.find((m) => m.userId === me.id);
      const leads = canManageSomeTeam(me.role);
      const now = new Date();

      const [mine, swaps, led, events] = await Promise.all([
        member ? schedulesService.listByMember(church.id, member.id) : Promise.resolve([]),
        swapsService.mine(church.id).catch(() => ({ incoming: [], outgoing: [] })),
        leads ? teamsService.listLed(church.id).catch(() => []) : Promise.resolve([]),
        leads
          ? eventsService
              .list(church.id, {
                from: now.toISOString(),
                to: new Date(now.getTime() + EVENTS_AHEAD_DAYS * 86_400_000).toISOString(),
              })
              .catch(() => [])
          : Promise.resolve([]),
      ]);

      const ledIds = new Set(led.map((team) => team.id));
      setSummary({
        upcoming: mine
          .filter((s) => holdsSlot(s) && s.event && new Date(s.event.eventDate) > now)
          .sort((a, b) => a.event!.eventDate.localeCompare(b.event!.eventDate)),
        pendingSwaps: swaps.incoming.length,
        ledTeams: led,
        eventsWaitingTeam: led.length
          ? events.filter(
              (e) => !e.recurrenceRule && !(e.teams ?? []).some((link) => ledIds.has(link.teamId)),
            ).length
          : 0,
      });
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setLoading(false);
    }
  }, [refreshUser, refreshUnread]);

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

  const go = (path: string) => router.push(path as Href);

  if (loading) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      </Screen>
    );
  }

  const next = summary.upcoming[0];
  const following = summary.upcoming.slice(1, NEXT_SCHEDULES);

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={[styles.content, clearance > 0 && { paddingBottom: clearance + spacing.lg }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <View style={styles.greetingBlock}>
            <Text style={[styles.greeting, { color: theme.app.textMuted }]}>Olá,</Text>
            <Text style={[styles.name, { color: theme.app.text }]}>{user?.name ?? 'bem-vindo'}</Text>
            {currentChurch ? (
              <Text style={[styles.church, { color: theme.app.textSubtle }]}>{currentChurch.name}</Text>
            ) : null}
          </View>

          <Pressable onPress={() => go('/notifications')} hitSlop={8} accessibilityLabel="Notificações">
            <Ionicons name="notifications-outline" size={26} color={theme.app.text} />
            {unread > 0 ? (
              <View style={[styles.badge, { backgroundColor: theme.colors.error }]}>
                <Text style={[styles.badgeText, { color: theme.colors.onError }]}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {error ? (
          <EmptyState icon="cloud-offline-outline" title="Não foi possível carregar" description={error} actionLabel="Tentar de novo" onAction={load} />
        ) : (
          <>
            {summary.pendingSwaps > 0 ? (
              <Card onPress={() => go('/swaps')} style={{ backgroundColor: theme.colors.primaryContainer }}>
                <View style={styles.alertRow}>
                  <Ionicons name="swap-horizontal" size={22} color={theme.colors.onPrimaryContainer} />
                  <Text style={[styles.alertText, { color: theme.colors.onPrimaryContainer }]}>
                    {summary.pendingSwaps} pedido(s) de troca esperando sua resposta
                  </Text>
                </View>
              </Card>
            ) : null}

            {summary.eventsWaitingTeam > 0 ? (
              <Card onPress={() => go('/events')} style={{ backgroundColor: theme.app.surfaceSunken }}>
                <View style={styles.alertRow}>
                  <Ionicons name="megaphone-outline" size={22} color={theme.colors.primary} />
                  <Text style={[styles.alertText, { color: theme.app.text }]}>
                    {summary.eventsWaitingTeam} evento(s) esperando a sua equipe
                  </Text>
                </View>
              </Card>
            ) : null}

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.app.text }]}>Sua próxima escala</Text>
              {next ? (
                <Card onPress={() => go('/schedules')} accentColor={next.team?.color}>
                  <Text style={[styles.nextName, { color: theme.app.text }]}>{next.event?.name}</Text>
                  <Text style={[styles.nextDate, { color: theme.colors.primary }]}>
                    {next.event ? formatWhen(next.event.eventDate) : ''}
                  </Text>
                  <Text style={[styles.nextRole, { color: theme.app.textMuted }]}>
                    {next.teamRole?.name} · {next.team?.name}
                  </Text>
                </Card>
              ) : (
                <Text style={[styles.hint, { color: theme.app.textSubtle }]}>
                  Você não está escalado nos próximos dias. Quando for, avisamos por aqui.
                </Text>
              )}

              {following.map((item) => (
                <Card key={item.id} onPress={() => go('/schedules')} accentColor={item.team?.color}>
                  <Text style={[styles.rowName, { color: theme.app.text }]}>{item.event?.name}</Text>
                  <Text style={[styles.rowMeta, { color: theme.app.textMuted }]}>
                    {item.event ? formatWhen(item.event.eventDate) : ''} · {item.teamRole?.name}
                  </Text>
                </Card>
              ))}
            </View>

            <View style={styles.shortcuts}>
              <Shortcut icon="calendar-outline" label="Minhas escalas" onPress={() => go('/schedules')} />
              <Shortcut icon="swap-horizontal-outline" label="Trocas" onPress={() => go('/swaps')} />
              <Shortcut icon="calendar-clear-outline" label="Disponibilidade" onPress={() => go('/availability')} />
              {isLeader ? <Shortcut icon="mail-outline" label="Convidar pessoas" onPress={() => go('/invitations')} /> : null}
              {isLeader ? <Shortcut icon="logo-whatsapp" label="Compartilhar escala" onPress={() => setSharing(true)} /> : null}
              {canSeeReports ? <Shortcut icon="bar-chart-outline" label="Relatórios" onPress={() => go('/reports')} /> : null}
            </View>
          </>
        )}
      </ScrollView>

      {currentChurch ? (
        <ShareScheduleSheet
          key={summary.ledTeams.map((team) => team.id).join()}
          visible={sharing}
          onDismiss={() => setSharing(false)}
          churchId={currentChurch.id}
          teams={summary.ledTeams}
          onError={setToast}
        />
      ) : null}

      <Snackbar wrapperStyle={{ bottom: clearance }} visible={toast !== null} onDismiss={() => setToast(null)} duration={3000}>
        {toast ?? ''}
      </Snackbar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  greetingBlock: { flex: 1 },
  greeting: { fontFamily: fontFamily.body, fontSize: fontSize.sm },
  name: { fontFamily: fontFamily.display, fontSize: fontSize.xxl, marginTop: 2 },
  church: { fontFamily: fontFamily.body, fontSize: fontSize.xs, marginTop: 2 },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fontFamily.bodyBold, fontSize: 10 },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  alertText: { flex: 1, fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm },
  section: { gap: spacing.md },
  sectionTitle: { fontFamily: fontFamily.displayMedium, fontSize: fontSize.lg },
  nextName: { fontFamily: fontFamily.display, fontSize: fontSize.xl },
  nextDate: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.md, marginTop: 2, textTransform: 'capitalize' },
  nextRole: { fontFamily: fontFamily.body, fontSize: fontSize.sm, marginTop: spacing.sm },
  rowName: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.md },
  rowMeta: { fontFamily: fontFamily.body, fontSize: fontSize.sm, marginTop: 2 },
  hint: { fontFamily: fontFamily.body, fontSize: fontSize.sm, lineHeight: 20 },
  shortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  shortcut: {
    width: '47%',
    flexGrow: 1,
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  shortcutLabel: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm },
});
