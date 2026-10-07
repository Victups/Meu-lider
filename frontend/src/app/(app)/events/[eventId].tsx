import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { ActivityIndicator, Button, FAB, Snackbar, Switch } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SelectField } from '@/components/form';
import { Avatar, Card, EmptyState, RoleChip, Screen, Sheet, StatusBadge } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { hasStarted, holdsSlot, statusLabel } from '@/lib/schedule';
import { describeRecurrence, parseRecurrenceRule } from '@/lib/recurrence';
import { eventsService, membersService, schedulesService, teamsService } from '@/services';
import { useAuthStore } from '@/stores/auth';
import { useChurchStore } from '@/stores/church';
import { fontFamily, fontSize, radius, spacing } from '@/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import type { Event, EventTeamLink, Member, Schedule, Team, TeamRole } from '@/types';

export default function EventDetailScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const currentChurch = useChurchStore((s) => s.currentChurch);
  const user = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore((s) => s.isAdmin);

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

  // Auto-schedule by leader: select which roles to fill
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [eventTeamRoles, setEventTeamRoles] = useState<TeamRole[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const [scheduling, setScheduling] = useState(false);

  // Swap / manage a single schedule
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [swapping, setSwapping] = useState(false);

  // Teams the user leads (every team, for church admins)
  const [ledTeams, setLedTeams] = useState<Team[]>([]);
  const [linkOpen, setLinkOpen] = useState(false);
  const [applyToSeries, setApplyToSeries] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);

  const eventTeamIds = new Set((event?.teams ?? []).map((link) => link.teamId));
  const ledIds = new Set(ledTeams.map((team) => team.id));
  const managedTeamIds = [...eventTeamIds].filter((id) => isAdmin() || ledIds.has(id));
  const canManage = isAdmin() || managedTeamIds.length > 0;
  const upcoming = event ? !hasStarted({ event }) : false;
  const linkable = isAdmin() ? [] : ledTeams;

  const load = useCallback(async () => {
    if (!currentChurch || !eventId) return;
    try {
      setError(null);
      const [loadedEvent, loadedSchedules, loadedTeams, loadedMembers, led] = await Promise.all([
        eventsService.getById(currentChurch.id, eventId),
        schedulesService.listByEvent(currentChurch.id, eventId),
        teamsService.list(currentChurch.id),
        membersService.list(currentChurch.id),
        teamsService.listLed(currentChurch.id).catch(() => [] as Team[]),
      ]);

      setEvent(loadedEvent);
      setSchedules(loadedSchedules);
      setTeams(loadedTeams);
      setMembers(loadedMembers);
      setLedTeams(led);
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
    const scheduled = schedules.filter(
      (s) => s.status === 'SCHEDULED' || s.status === 'CONFIRMED',
    ).length;
    return { scheduled, total: schedules.length };
  }, [schedules]);

  const availableMembers = useMemo(() => {
    const takenInTeam = new Set(
      schedules.filter((s) => s.teamId === teamId).map((s) => s.memberId),
    );
    return members.filter((member) => !takenInTeam.has(member.id));
  }, [members, schedules, teamId]);

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

  const openAutoSchedule = async () => {
    if (!currentChurch || !event?.teams?.length) return;
    setScheduleOpen(true);
    setEventTeamRoles([]);
    setSelectedRoleIds(new Set());

    const allRoles: TeamRole[] = [];
    for (const tId of managedTeamIds) {
      const teamRoles = await teamsService.listRoles(currentChurch.id, tId).catch(() => []);
      allRoles.push(...teamRoles);
    }
    setEventTeamRoles(allRoles);
    setSelectedRoleIds(new Set(allRoles.map((r) => r.id)));
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  };

  const handleAutoSchedule = async () => {
    if (!currentChurch || !eventId || selectedRoleIds.size === 0) return;
    setScheduling(true);
    try {
      const result = await schedulesService.autoSchedule(currentChurch.id, eventId, {
        roleIds: [...selectedRoleIds],
      });
      setScheduleOpen(false);
      const msg = result.createdCount > 0
        ? `${result.createdCount} pessoa(s) escalada(s)${result.missingCount > 0 ? `, ${result.missingCount} vaga(s) sem candidato` : ''}`
        : 'Todas as vagas já estavam preenchidas';
      setToast(msg);
      await load();
    } catch (err) {
      setToast(toUserMessage(err));
    } finally {
      setScheduling(false);
    }
  };

  const toggleLink = async (team: Team) => {
    if (!currentChurch || !eventId) return;
    setLinking(team.id);
    try {
      if (eventTeamIds.has(team.id)) {
        await eventsService.unlinkTeam(currentChurch.id, eventId, team.id);
        setToast(`${team.name} saiu deste evento`);
      } else {
        await eventsService.linkTeam(currentChurch.id, eventId, team.id, applyToSeries);
        setToast(`${team.name} vinculada: escala montada`);
      }
      await load();
    } catch (err) {
      setToast(toUserMessage(err));
    } finally {
      setLinking(null);
    }
  };

  const handleAttendance = async (absent: boolean) => {
    if (!currentChurch || !selectedSchedule) return;
    setSwapping(true);
    try {
      await (absent
        ? schedulesService.markNoShow(currentChurch.id, selectedSchedule.id)
        : schedulesService.markAttended(currentChurch.id, selectedSchedule.id));
      setSelectedSchedule(null);
      setToast(absent ? 'Falta registrada' : 'Falta desfeita');
      await load();
    } catch (err) {
      setToast(toUserMessage(err));
    } finally {
      setSwapping(false);
    }
  };

  const handleSwap = async () => {
    if (!currentChurch || !selectedSchedule) return;
    setSwapping(true);
    try {
      await schedulesService.releaseByLeader(
        currentChurch.id,
        selectedSchedule.id,
        'Troca pelo líder',
      );
      setSelectedSchedule(null);
      setToast('Troca realizada — o motor escalou outra pessoa');
      await load();
    } catch (err) {
      setToast(toUserMessage(err));
    } finally {
      setSwapping(false);
    }
  };

  const handleRemoveSchedule = async () => {
    if (!currentChurch || !selectedSchedule) return;
    setSwapping(true);
    try {
      await schedulesService.remove(currentChurch.id, selectedSchedule.id);
      setSelectedSchedule(null);
      setToast('Escala removida');
      await load();
    } catch (err) {
      setToast(toUserMessage(err));
    } finally {
      setSwapping(false);
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

  const eventTeams = event?.teams ?? [];

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

            {eventTeams.length > 0 ? (
              <View style={styles.teamsRow}>
                {eventTeams.map((link) => (
                  <View
                    key={link.id}
                    style={[styles.teamTag, { backgroundColor: link.team?.color ?? theme.colors.primary + '22' }]}
                  >
                    <Text style={[styles.teamTagText, { color: theme.app.text }]}>
                      {link.team?.name ?? 'Equipe'}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {linkable.length > 0 && upcoming ? (
              <Pressable
                onPress={() => setLinkOpen(true)}
                style={[styles.repeat, { backgroundColor: theme.colors.primaryContainer }]}
              >
                <Ionicons name="people-outline" size={16} color={theme.colors.onPrimaryContainer} />
                <Text style={[styles.repeatText, { color: theme.colors.onPrimaryContainer }]}>
                  {linkable.some((team) => !eventTeamIds.has(team.id))
                    ? 'Sua equipe ainda não está neste evento'
                    : 'Gerenciar a participação da sua equipe'}
                </Text>
                <Text style={[styles.repeatAction, { color: theme.colors.primary }]}>
                  {linkable.some((team) => !eventTeamIds.has(team.id)) ? 'Vincular' : 'Abrir'}
                </Text>
              </Pressable>
            ) : null}

            <View style={[styles.summary, { backgroundColor: theme.app.surfaceSunken }]}>
              <Text style={[styles.summaryValue, { color: theme.app.text }]}>
                {summary.scheduled}/{summary.total}
              </Text>
              <Text style={[styles.summaryLabel, { color: theme.app.textMuted }]}>
                {summary.total === 0 ? 'ninguém escalado' : 'escalados'}
              </Text>
            </View>

            {canManage && eventTeams.length > 0 ? (
              <Button
                mode="contained"
                icon="auto-fix"
                onPress={openAutoSchedule}
                style={styles.autoScheduleBtn}
                contentStyle={styles.autoScheduleContent}
              >
                Montar escala
              </Button>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="Escala vazia"
            description={canManage ? 'Toque em "Montar escala" para o motor escolher as pessoas.' : 'A escala deste evento ainda não foi montada.'}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={
              (isAdmin() || ledIds.has(item.teamId)) && item.status !== 'CANCELLED'
                ? () => setSelectedSchedule(item)
                : undefined
            }
          >
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
                <StatusBadge status={item.status} label={statusLabel({ ...item, event: item.event ?? event ?? undefined })} />
              </View>
            </Card>
          </Pressable>
        )}
      />

      {canManage ? (
        <FAB icon="account-plus" style={styles.fab} onPress={() => setFormOpen(true)} />
      ) : null}

      {/* Auto-schedule: leader picks which roles to fill */}
      <Sheet
        visible={scheduleOpen}
        onDismiss={() => setScheduleOpen(false)}
        title="Montar escala"
        subtitle="Marque as funções que precisa neste evento"
        footer={
          <>
            <Button
              mode="outlined"
              onPress={() => setScheduleOpen(false)}
              style={styles.sheetAction}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleAutoSchedule}
              loading={scheduling}
              disabled={selectedRoleIds.size === 0 || scheduling}
              style={styles.sheetAction}
            >
              Escalar
            </Button>
          </>
        }
      >
        {eventTeamRoles.length === 0 ? (
          <ActivityIndicator />
        ) : (
          <View style={styles.roleGrid}>
            {eventTeamRoles.map((role) => (
              <RoleChip
                key={role.id}
                label={role.name}
                selected={selectedRoleIds.has(role.id)}
                onPress={() => toggleRole(role.id)}
              />
            ))}
          </View>
        )}
      </Sheet>

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

      {/* A leader attaching (or removing) their own team */}
      <Sheet
        visible={linkOpen}
        onDismiss={() => setLinkOpen(false)}
        title="Sua equipe neste evento"
        subtitle="Ao vincular, a escala da equipe é montada na hora."
        footer={
          <Button mode="outlined" onPress={() => setLinkOpen(false)} style={styles.sheetAction}>
            Fechar
          </Button>
        }
      >
        {event?.recurrenceRule === null && event?.name ? (
          <View style={styles.switchRow}>
            <Text style={[styles.switchText, { color: theme.app.text }]}>
              Repetir para as próximas datas de "{event.name}"
            </Text>
            <Switch value={applyToSeries} onValueChange={setApplyToSeries} />
          </View>
        ) : null}
        {linkable.map((team) => (
          <Button
            key={team.id}
            mode={eventTeamIds.has(team.id) ? 'outlined' : 'contained'}
            icon={eventTeamIds.has(team.id) ? 'link-off' : 'link-variant'}
            loading={linking === team.id}
            disabled={linking !== null}
            onPress={() => toggleLink(team)}
            style={styles.actionBtn}
          >
            {eventTeamIds.has(team.id) ? `Desvincular ${team.name}` : `Vincular ${team.name}`}
          </Button>
        ))}
      </Sheet>

      {/* Schedule action sheet */}
      <Sheet
        visible={selectedSchedule !== null}
        onDismiss={() => setSelectedSchedule(null)}
        title={selectedSchedule?.member?.fullName ?? 'Membro'}
        subtitle={`${selectedSchedule?.team?.name ?? 'Equipe'} · ${selectedSchedule?.teamRole?.name ?? 'Função'}`}
        footer={
          <Button
            mode="outlined"
            onPress={() => setSelectedSchedule(null)}
            style={styles.sheetAction}
          >
            Fechar
          </Button>
        }
      >
        {selectedSchedule && !upcoming && holdsSlot(selectedSchedule) ? (
          <Button
            mode="contained"
            icon="account-alert-outline"
            onPress={() => handleAttendance(true)}
            loading={swapping}
            disabled={swapping}
            buttonColor={theme.colors.error}
            style={styles.actionBtn}
          >
            Marcar falta
          </Button>
        ) : null}
        {selectedSchedule?.status === 'NO_SHOW' ? (
          <Button
            mode="contained"
            icon="account-check-outline"
            onPress={() => handleAttendance(false)}
            loading={swapping}
            disabled={swapping}
            style={styles.actionBtn}
          >
            Desfazer falta (esteve presente)
          </Button>
        ) : null}
        {upcoming ? (
          <Button
            mode="contained"
            icon="swap-horizontal"
            onPress={handleSwap}
            loading={swapping}
            disabled={swapping}
            style={styles.actionBtn}
          >
            Trocar pessoa
          </Button>
        ) : null}
        <Button
          mode="outlined"
          icon="account-remove"
          onPress={handleRemoveSchedule}
          loading={swapping}
          disabled={swapping}
          textColor={theme.colors.error}
          style={styles.actionBtn}
        >
          Remover da escala
        </Button>
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
  teamsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  teamTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  teamTagText: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs },
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
  autoScheduleBtn: { borderRadius: radius.md, marginTop: spacing.sm },
  autoScheduleContent: { paddingVertical: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  info: { flex: 1, gap: 2 },
  memberName: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.md },
  role: { fontFamily: fontFamily.body, fontSize: fontSize.sm },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sheetAction: { flex: 1, borderRadius: radius.md },
  actionBtn: { borderRadius: radius.md },
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
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  switchText: { flex: 1, fontFamily: fontFamily.body, fontSize: fontSize.sm },
});
