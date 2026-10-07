import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, Share, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Button, FAB, IconButton, Snackbar } from 'react-native-paper';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SelectField } from '@/components/form';
import { Card, EmptyState, Screen, Sheet } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { invitationsService, teamsService } from '@/services';
import { useAuthStore } from '@/stores/auth';
import { useChurchStore } from '@/stores/church';
import { fontFamily, fontSize, radius, spacing } from '@/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import type { Invitation, Team } from '@/types';

const NO_TEAM = 'none';
const VALIDITY = [
  { value: '7', label: '7 dias' },
  { value: '30', label: '30 dias' },
  { value: '90', label: '90 dias' },
];

/** Short codes a leader hands out; whoever signs up with one joins the church (and team). */
export default function InvitationsScreen() {
  const theme = useAppTheme();
  const { teamId: presetTeam } = useLocalSearchParams<{ teamId?: string }>();
  const currentChurch = useChurchStore((s) => s.currentChurch);
  const isAdmin = useAuthStore((s) => s.isAdmin);

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [teamId, setTeamId] = useState<string>(presetTeam ?? NO_TEAM);
  const [days, setDays] = useState('7');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!currentChurch) return;
    try {
      setError(null);
      const [list, led] = await Promise.all([
        invitationsService.list(currentChurch.id),
        teamsService.listLed(currentChurch.id),
      ]);
      setInvitations(list);
      setTeams(led);
      // A leader can only invite into a team they lead.
      setTeamId((current) => (current === NO_TEAM && !isAdmin() && led[0] ? led[0].id : current));
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setLoading(false);
    }
  }, [currentChurch, isAdmin]);

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

  const share = (invitation: Invitation) =>
    Share.share({ message: invitation.shareText }).catch(() => undefined);

  const create = async () => {
    if (!currentChurch) return;
    setSaving(true);
    try {
      const created = await invitationsService.create(currentChurch.id, {
        teamId: teamId === NO_TEAM ? undefined : teamId,
        expiresInDays: Number(days),
      });
      setCreating(false);
      await load();
      await share(created);
    } catch (err) {
      setToast(toUserMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const revoke = async (invitation: Invitation) => {
    if (!currentChurch) return;
    try {
      await invitationsService.revoke(currentChurch.id, invitation.id);
      setToast('Convite cancelado');
      await load();
    } catch (err) {
      setToast(toUserMessage(err));
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

  const teamOptions = [
    ...(isAdmin() ? [{ value: NO_TEAM, label: 'Só entrar na igreja (sem equipe)' }] : []),
    ...teams.map((team) => ({ value: team.id, label: `Equipe ${team.name}` })),
  ];

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.app.text }]}>Convites</Text>
        <Text style={[styles.subtitle, { color: theme.app.textMuted }]}>
          Mande o código por WhatsApp: a pessoa cria a conta e já entra na equipe.
        </Text>
      </View>

      <FlatList
        data={invitations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={invitations.length === 0 ? styles.emptyList : styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState
            icon={error ? 'cloud-offline-outline' : 'mail-outline'}
            title={error ?? 'Nenhum convite ativo'}
            description={error ? undefined : 'Toque em “Novo convite” para gerar um código.'}
            actionLabel={error ? 'Tentar de novo' : undefined}
            onAction={error ? load : undefined}
          />
        }
        renderItem={({ item }) => (
          <Card>
            <Text style={[styles.code, { color: theme.colors.primary }]}>{item.code}</Text>
            <Text style={[styles.line, { color: theme.app.textMuted }]}>
              {item.teamName ? `Equipe ${item.teamName}` : 'Sem equipe'} · vale até{' '}
              {format(new Date(item.expiresAt), 'dd/MM', { locale: ptBR })} · usado {item.usedCount}
              {item.maxUses ? `/${item.maxUses}` : ''}x
            </Text>
            <View style={styles.actions}>
              <Button mode="contained-tonal" icon="share-variant" onPress={() => share(item)} style={styles.action}>
                Compartilhar
              </Button>
              <IconButton icon="delete-outline" iconColor={theme.colors.error} onPress={() => revoke(item)} />
            </View>
          </Card>
        )}
      />

      <FAB icon="plus" label="Novo convite" style={styles.fab} onPress={() => setCreating(true)} />

      <Sheet
        visible={creating}
        onDismiss={() => setCreating(false)}
        title="Novo convite"
        footer={
          <>
            <Button mode="outlined" onPress={() => setCreating(false)} style={styles.action}>
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={create}
              loading={saving}
              disabled={saving || teamOptions.length === 0}
              style={styles.action}
            >
              Gerar e compartilhar
            </Button>
          </>
        }
      >
        <SelectField
          label="Entra em"
          value={teamId}
          onSelect={setTeamId}
          options={teamOptions}
          emptyMessage="Você ainda não lidera nenhuma equipe"
        />
        <SelectField label="Validade" value={days} onSelect={setDays} options={VALIDITY} />
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
  list: { paddingHorizontal: spacing.lg, paddingBottom: 96, gap: spacing.md },
  emptyList: { flexGrow: 1 },
  code: { fontFamily: fontFamily.display, fontSize: 32, letterSpacing: 4 },
  line: { fontFamily: fontFamily.body, fontSize: fontSize.sm, marginTop: spacing.xs },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  action: { flex: 1, borderRadius: radius.md },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg },
});
