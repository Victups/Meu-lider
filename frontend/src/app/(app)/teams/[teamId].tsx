import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { ActivityIndicator, Button, FAB, Snackbar, TextInput } from 'react-native-paper';
import { SelectField } from '@/components/form';
import { Avatar, Card, EmptyState, RoleChip, Screen, Sheet } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { membersService, teamsService } from '@/services';
import { useAuthStore } from '@/stores/auth';
import { useChurchStore } from '@/stores/church';
import { fontFamily, fontSize, radius, spacing } from '@/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import type { ID, Member, Team, TeamMember, TeamRole } from '@/types';

type RolesByMember = Record<ID, TeamRole[]>;

export default function TeamDetailScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation();
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const currentChurch = useChurchStore((s) => s.currentChurch);
  const canManage = useAuthStore((s) => s.canManageTeams);

  const [team, setTeam] = useState<Team | null>(null);
  const [roles, setRoles] = useState<TeamRole[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [memberRoles, setMemberRoles] = useState<RolesByMember>({});
  const [churchMembers, setChurchMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [memberId, setMemberId] = useState<ID | null>(null);

  const [addRoleOpen, setAddRoleOpen] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [roleSlots, setRoleSlots] = useState('1');

  const [assignTo, setAssignTo] = useState<TeamMember | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!currentChurch || !teamId) return;
    try {
      setError(null);
      const [loadedTeam, loadedRoles, loadedMembers, roster] = await Promise.all([
        teamsService.getById(currentChurch.id, teamId),
        teamsService.listRoles(currentChurch.id, teamId),
        teamsService.listMembers(currentChurch.id, teamId),
        membersService.list(currentChurch.id),
      ]);

      setTeam(loadedTeam);
      setRoles(loadedRoles);
      setTeamMembers(loadedMembers);
      setChurchMembers(roster);
      navigation.setOptions({ title: loadedTeam.name });

      const pairs = await Promise.all(
        loadedMembers.map(async (entry) => {
          const list = await teamsService
            .listMemberRoles(currentChurch.id, teamId, entry.memberId)
            .catch(() => [] as TeamRole[]);
          return [entry.memberId, list] as const;
        }),
      );
      setMemberRoles(Object.fromEntries(pairs));
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setLoading(false);
    }
  }, [currentChurch, teamId, navigation]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const candidates = useMemo(() => {
    const alreadyIn = new Set(teamMembers.map((entry) => entry.memberId));
    return churchMembers.filter((member) => !alreadyIn.has(member.id));
  }, [churchMembers, teamMembers]);

  const runAction = async (action: () => Promise<unknown>, message: string) => {
    setSaving(true);
    try {
      await action();
      setToast(message);
      await load();
      return true;
    } catch (err) {
      setToast(toUserMessage(err));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async () => {
    if (!currentChurch || !teamId || !memberId) return;
    const ok = await runAction(
      () => teamsService.addMember(currentChurch.id, teamId, memberId),
      'Membro adicionado',
    );
    if (ok) {
      setAddMemberOpen(false);
      setMemberId(null);
    }
  };

  const handleAddRole = async () => {
    if (!currentChurch || !teamId || !roleName.trim()) return;
    const ok = await runAction(
      () =>
        teamsService.createRole(currentChurch.id, teamId, {
          name: roleName.trim(),
          defaultSlots: Number(roleSlots) || 1,
        }),
      'Função criada',
    );
    if (ok) {
      setAddRoleOpen(false);
      setRoleName('');
      setRoleSlots('1');
    }
  };

  const toggleMemberRole = async (entry: TeamMember, role: TeamRole) => {
    if (!currentChurch || !teamId) return;
    const current = memberRoles[entry.memberId] ?? [];
    const has = current.some((item) => item.id === role.id);

    await runAction(
      () =>
        has
          ? teamsService.unassignMemberRole(currentChurch.id, teamId, entry.memberId, role.id)
          : teamsService.assignMemberRole(currentChurch.id, teamId, entry.memberId, role.id),
      has ? `${role.name} removida` : `${role.name} atribuída`,
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

  if (error && !team) {
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
      <ScrollView contentContainerStyle={styles.content}>
        {team?.description ? (
          <Text style={[styles.description, { color: theme.app.textMuted }]}>
            {team.description}
          </Text>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={[styles.sectionTitle, { color: theme.app.text }]}>Funções</Text>
            {canManage() ? (
              <Button compact onPress={() => setAddRoleOpen(true)}>
                Nova
              </Button>
            ) : null}
          </View>

          {roles.length === 0 ? (
            <Text style={[styles.hint, { color: theme.app.textSubtle }]}>
              Crie as funções desta equipe — vocal, baixo, fotógrafo — para poder escalar pessoas.
            </Text>
          ) : (
            <View style={styles.chips}>
              {roles.map((role) => (
                <RoleChip key={role.id} label={role.name} count={role.defaultSlots} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.app.text }]}>
            Integrantes{teamMembers.length > 0 ? ` · ${teamMembers.length}` : ''}
          </Text>

          {teamMembers.length === 0 ? (
            <Text style={[styles.hint, { color: theme.app.textSubtle }]}>
              Adicione quem faz parte desta equipe para poder escalá-los.
            </Text>
          ) : (
            teamMembers.map((entry) => {
              const assigned = memberRoles[entry.memberId] ?? [];

              return (
                <Card key={entry.id} style={styles.memberCard}>
                  <View style={styles.memberRow}>
                    <Avatar name={entry.member?.fullName ?? '?'} color={team?.color} />
                    <View style={styles.memberInfo}>
                      <Text style={[styles.memberName, { color: theme.app.text }]}>
                        {entry.member?.fullName ?? 'Membro'}
                      </Text>
                      <Text style={[styles.memberRole, { color: theme.app.textMuted }]}>
                        {entry.isLeader ? 'Líder' : 'Integrante'}
                      </Text>
                    </View>
                    {canManage() && roles.length > 0 ? (
                      <Button compact onPress={() => setAssignTo(entry)}>
                        Funções
                      </Button>
                    ) : null}
                  </View>

                  {assigned.length > 0 ? (
                    <View style={styles.memberChips}>
                      {assigned.map((role) => (
                        <RoleChip key={role.id} label={role.name} selected />
                      ))}
                    </View>
                  ) : null}
                </Card>
              );
            })
          )}
        </View>
      </ScrollView>

      {canManage() ? (
        <FAB icon="account-plus" style={styles.fab} onPress={() => setAddMemberOpen(true)} />
      ) : null}

      <Sheet
        visible={addMemberOpen}
        onDismiss={() => setAddMemberOpen(false)}
        title="Adicionar à equipe"
        subtitle={team?.name}
        footer={
          <>
            <Button mode="outlined" onPress={() => setAddMemberOpen(false)} style={styles.action}>
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleAddMember}
              loading={saving}
              disabled={!memberId || saving}
              style={styles.action}
            >
              Adicionar
            </Button>
          </>
        }
      >
        <SelectField
          label="Membro"
          value={memberId}
          onSelect={setMemberId}
          options={candidates.map((member) => ({ value: member.id, label: member.fullName }))}
          emptyMessage="Todos os membros já estão nesta equipe"
        />
      </Sheet>

      <Sheet
        visible={addRoleOpen}
        onDismiss={() => setAddRoleOpen(false)}
        title="Nova função"
        subtitle={`Em ${team?.name ?? 'equipe'}`}
        footer={
          <>
            <Button mode="outlined" onPress={() => setAddRoleOpen(false)} style={styles.action}>
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleAddRole}
              loading={saving}
              disabled={!roleName.trim() || saving}
              style={styles.action}
            >
              Criar
            </Button>
          </>
        }
      >
        <TextInput
          mode="outlined"
          label="Nome da função"
          placeholder="Vocal, baixo, fotógrafo..."
          value={roleName}
          onChangeText={setRoleName}
        />
        <TextInput
          mode="outlined"
          label="Quantas pessoas por evento"
          value={roleSlots}
          onChangeText={setRoleSlots}
          keyboardType="number-pad"
        />
      </Sheet>

      <Sheet
        visible={assignTo !== null}
        onDismiss={() => setAssignTo(null)}
        title={assignTo?.member?.fullName ?? 'Funções'}
        subtitle="Toque para marcar o que esta pessoa cobre"
        footer={
          <Button mode="contained" onPress={() => setAssignTo(null)} style={styles.action}>
            Pronto
          </Button>
        }
      >
        <View style={styles.chips}>
          {roles.map((role) => {
            const assigned = (memberRoles[assignTo?.memberId ?? ''] ?? []).some(
              (item) => item.id === role.id,
            );
            return (
              <RoleChip
                key={role.id}
                label={role.name}
                selected={assigned}
                onPress={() => assignTo && toggleMemberRole(assignTo, role)}
              />
            );
          })}
        </View>
      </Sheet>

      <Snackbar visible={toast !== null} onDismiss={() => setToast(null)} duration={2500}>
        {toast ?? ''}
      </Snackbar>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 96, gap: spacing.xl },
  description: { fontFamily: fontFamily.body, fontSize: fontSize.sm, lineHeight: 20 },
  section: { gap: spacing.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: fontFamily.displayMedium, fontSize: fontSize.lg },
  hint: { fontFamily: fontFamily.body, fontSize: fontSize.sm, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  memberCard: { marginBottom: spacing.sm },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  memberInfo: { flex: 1, gap: 2 },
  memberName: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.md },
  memberRole: { fontFamily: fontFamily.body, fontSize: fontSize.sm },
  memberChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  action: { flex: 1, borderRadius: radius.md },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg },
});
