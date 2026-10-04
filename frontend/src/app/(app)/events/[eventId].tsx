import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { ActivityIndicator, Button, FAB, Snackbar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SelectField } from '@/components/form';
import { Avatar, Card, EmptyState, Screen, Sheet, StatusBadge } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { describeRecurrence, parseRecurrenceRule } from '@/lib/recurrence';
import { eventsService, membersService, schedulesService, teamsService } from '@/services';
import { useAuthStore } from '@/stores/auth';
import { useChurchStore } from '@/stores/church';
import { fontFamily, fontSize, radius, spacing } from '@/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import type { Event, Member, Schedule, Team, TeamRole } from '@/types';

export default function EventDetailScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const currentChurch = useChurchStore((s) => s.currentChurch);
  const canManage = useAuthStore((s) => s.canManageTeams);

  const [event, setEvent] = useState<Event | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [occurrencesOpen, setOccurrencesOpen] = useState(false);
  const [preview, setPreview] = useState<string[] | null>(null);
  const [generating, setGenerating] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [teamRoleId, setTeamRoleId] = useState<string | null>(null);
  const [roles, setRoles] = useState<TeamRole[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!currentChurch || !eventId) return;
    try {
      setError(null);
      const [loadedEvent, loadedSchedules, loadedTeams, loadedMembers] = await Promise.all([
        eventsService.getById(currentChurch.id, eventId),
        schedulesService.listByEvent(currentChurch.id, eventId),
        teamsService.list(currentChurch.id),
        membersService.list(currentChurch.id),
      ]);

      setEvent(loadedEvent);
      setSchedules(loadedSchedules);
      setTeams(loadedTeams);
      setMembers(loadedMembers);
      navigation.setOptions({ title: loadedEvent.name });
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setLoading(false);
    }
  }, [currentChurch, eventId, navigation]);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const summary = useMemo(() => {
    const confirmed = schedules.filter((s) => s.status === 'CONFIRMED').length;
    return { confirmed, total: schedules.length };
  }, [schedules]);

  const availableMembers = useMemo(() => {
    const takenInTeam = new Set(
      schedules.filter((s) => s.teamId === teamId).map((s) => s.memberId),
    );
    return members.filter((member) => !takenInTeam.has(member.id));
  }, [members, schedules, teamId]);

  // Positions belong to the team, so the list reloads whenever it changes.
  useEffect(() => {
    if (!currentChurch || !teamId) {
      setRoles([]);
      return;
    }
    teamsService
      .listRoles(currentChurch.id, teamId)
      .then(setRoles)
      .catch(() => setRoles([]));
  }, [currentChurch, teamId]);

  const openOccurrences = async () => {
    if (!currentChurch || !eventId) return;
    setOccurrencesOpen(true);
    setPreview(null);
    try {
      const result = await eventsService.previewOccurrences(currentChurch.id, eventId, 12);
      setPreview(result.dates);
    } catch (err) {
      setToast(toUserMessage(err));
      setOccurrencesOpen(false);
    }
  };

  const generateOccurrences = async () => {
    if (!currentChurch || !eventId) return;
    setGenerating(true);
    try {
      // autoSchedule: each new date is staffed as it is created.
      const result = await eventsService.materializeOccurrences(currentChurch.id, eventId, {
        weeksAhead: 12,
        autoSchedule: true,
      });
      setOccurrencesOpen(false);
      setToast(
        result.createdCount > 0
          ? `${result.createdCount} data(s) criada(s) e escalada(s)`
          : 'As datas já estavam criadas',
      );
    } catch (err) {
      setToast(toUserMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const resetForm = () => {
    setFormOpen(false);
    setTeamId(null);
    setMemberId(null);
    setTeamRoleId(null);
  };

  const handleAssign = async () => {
    if (!currentChurch || !eventId || !teamId || !memberId || !teamRoleId) return;
    setSaving(true);
    try {
      await schedulesService.create(currentChurch.id, {
        eventId,
        teamId,
        memberId,
        teamRoleId,
      });
      resetForm();
      setToast('Pessoa escalada');
      await load();
    } catch (err) {
      setToast(toUserMessage(err));
    } finally {
      setSaving(false);
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

  if (error && !event) {
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
        data={schedules}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            {event ? (
              <>
                <Text style={[styles.date, { color: theme.colors.primary }]}>
                  {format(new Date(event.eventDate), "EEEE, d 'de' MMMM 'às' HH'h'mm", {
                    locale: ptBR,
                  })}
                </Text>
                {event.location ? (
                  <Text style={[styles.location, { color: theme.app.textMuted }]}>
                    {event.location}
                  </Text>
                ) : null}
              </>
            ) : null}

            {event?.recurrenceRule ? (
              <Pressable
                onPress={openOccurrences}
                style={[styles.repeat, { backgroundColor: theme.colors.primaryContainer }]}
              >
                <Ionicons name="repeat" size={16} color={theme.colors.onPrimaryContainer} />
                <Text style={[styles.repeatText, { color: theme.colors.onPrimaryContainer }]}>
                  {describeRecurrence(
                    parseRecurrenceRule(event.recurrenceRule, new Date(event.eventDate).getDay()),
                  )}
                </Text>
                <Text style={[styles.repeatAction, { color: theme.colors.primary }]}>
                  Gerar datas
                </Text>
              </Pressable>
            ) : null}

            <View style={[styles.summary, { backgroundColor: theme.app.surfaceSunken }]}>
              <Text style={[styles.summaryValue, { color: theme.app.text }]}>
                {summary.confirmed}/{summary.total}
              </Text>
              <Text style={[styles.summaryLabel, { color: theme.app.textMuted }]}>
                {summary.total === 0 ? 'ninguém escalado' : 'confirmaram presença'}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="Escala vazia"
            description="Adicione pessoas para servir neste evento."
            actionLabel={canManage() ? 'Escalar alguém' : undefined}
            onAction={canManage() ? () => setFormOpen(true) : undefined}
          />
        }
        renderItem={({ item }) => (
          <Card accentColor={item.team?.color}>
            <View style={styles.row}>
              <Avatar name={item.member?.fullName ?? '?'} color={item.team?.color} />
              <View style={styles.info}>
                <Text style={[styles.memberName, { color: theme.app.text }]}>
                  {item.member?.fullName ?? 'Membro'}
                </Text>
                <Text style={[styles.role, { color: theme.app.textMuted }]}>
                  {item.team?.name ?? 'Equipe'} · {item.teamRole?.name ?? 'Função'}
                </Text>
              </View>
              <StatusBadge status={item.status} />
            </View>
          </Card>
        )}
      />

      {canManage() ? (
        <FAB icon="account-plus" style={styles.fab} onPress={() => setFormOpen(true)} />
      ) : null}

      <Sheet
        visible={occurrencesOpen}
        onDismiss={() => setOccurrencesOpen(false)}
        title="Próximas datas"
        subtitle="As 12 semanas seguintes, já com escala montada"
        footer={
          <>
            <Button
              mode="outlined"
              onPress={() => setOccurrencesOpen(false)}
              style={styles.sheetAction}
            >
              Fechar
            </Button>
            <Button
              mode="contained"
              onPress={generateOccurrences}
              loading={generating}
              disabled={generating || !preview?.length}
              style={styles.sheetAction}
            >
              Criar datas
            </Button>
          </>
        }
      >
        {preview === null ? (
          <ActivityIndicator />
        ) : preview.length === 0 ? (
          <Text style={{ color: theme.app.textMuted }}>
            A regra não gera nenhuma data nas próximas 12 semanas.
          </Text>
        ) : (
          preview.map((date) => (
            <Text key={date} style={[styles.previewDate, { color: theme.app.text }]}>
              {format(new Date(date), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </Text>
          ))
        )}
      </Sheet>

      <Sheet
        visible={formOpen}
        onDismiss={resetForm}
        title="Escalar pessoa"
        subtitle={event?.name}
        footer={
          <>
            <Button mode="outlined" onPress={resetForm} style={styles.sheetAction}>
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleAssign}
              loading={saving}
              disabled={!teamId || !memberId || !teamRoleId || saving}
              style={styles.sheetAction}
            >
              Escalar
            </Button>
          </>
        }
      >
        <SelectField
          label="Equipe"
          value={teamId}
          onSelect={(value) => {
            setTeamId(value);
            setMemberId(null);
            setTeamRoleId(null);
          }}
          options={teams.map((team) => ({ value: team.id, label: team.name }))}
          emptyMessage="Crie uma equipe primeiro"
        />

        <SelectField
          label="Função"
          value={teamRoleId}
          onSelect={setTeamRoleId}
          options={roles.map((role) => ({ value: role.id, label: role.name }))}
          emptyMessage={teamId ? 'Esta equipe ainda não tem funções' : 'Escolha a equipe antes'}
        />

        <SelectField
          label="Membro"
          value={memberId}
          onSelect={setMemberId}
          options={availableMembers.map((member) => ({
            value: member.id,
            label: member.fullName,
          }))}
          emptyMessage={teamId ? 'Todos já escalados nesta equipe' : 'Escolha a equipe antes'}
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
  list: { paddingHorizontal: spacing.lg, paddingBottom: 88, gap: spacing.md },
  header: { paddingTop: spacing.lg, gap: spacing.xs },
  date: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.sm, textTransform: 'capitalize' },
  location: { fontFamily: fontFamily.body, fontSize: fontSize.sm },
  summary: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  summaryValue: { fontFamily: fontFamily.display, fontSize: fontSize.xl },
  summaryLabel: { fontFamily: fontFamily.body, fontSize: fontSize.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  info: { flex: 1, gap: 2 },
  memberName: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.md },
  role: { fontFamily: fontFamily.body, fontSize: fontSize.sm },
  sheetAction: { flex: 1, borderRadius: radius.md },
  repeat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  repeatText: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, flex: 1 },
  repeatAction: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.xs },
  previewDate: { fontFamily: fontFamily.body, fontSize: fontSize.sm, textTransform: 'capitalize' },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg },
});
