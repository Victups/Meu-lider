import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, FAB } from 'react-native-paper';
import { Avatar, Card, EmptyState, Screen } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { teamsService } from '@/services';
import { useAuthStore } from '@/stores/auth';
import { useChurchStore } from '@/stores/church';
import { fontFamily, fontSize, spacing } from '@/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import { useTabClearance } from '@/hooks/use-tab-clearance';
import type { Team } from '@/types';

export default function TeamsScreen() {
  const theme = useAppTheme();
  const clearance = useTabClearance();
  const router = useRouter();
  const currentChurch = useChurchStore((s) => s.currentChurch);
  const canManage = useAuthStore((s) => s.canManageTeams);

  const [teams, setTeams] = useState<Team[]>([]);
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
      setTeams(await teamsService.list(currentChurch.id));
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
        <Text style={[styles.title, { color: theme.app.text }]}>Equipes</Text>
        {currentChurch ? (
          <Text style={[styles.subtitle, { color: theme.app.textMuted }]}>{currentChurch.name}</Text>
        ) : null}
      </View>

      <FlatList
        data={teams}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[teams.length === 0 ? styles.emptyList : styles.list, clearance > 0 && { paddingBottom: clearance + 72 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState
            icon={error ? 'cloud-offline-outline' : 'people-outline'}
            title={error ? 'Não foi possível carregar' : 'Nenhuma equipe criada'}
            description={error ?? 'Louvor, mídia, recepção — cada equipe agrupa quem serve junto.'}
            actionLabel={error ? 'Tentar de novo' : canManage() ? 'Criar equipe' : undefined}
            onAction={error ? load : canManage() ? () => router.push('/teams/new') : undefined}
          />
        }
        renderItem={({ item, index }) => (
          <Card
            index={index}
            accentColor={item.color}
            onPress={() => router.push({ pathname: '/teams/[teamId]', params: { teamId: item.id } })}
          >
            <View style={styles.row}>
              <Avatar name={item.name} color={item.color} />
              <View style={styles.info}>
                <Text style={[styles.name, { color: theme.app.text }]}>{item.name}</Text>
                {item.description ? (
                  <Text
                    numberOfLines={2}
                    style={[styles.description, { color: theme.app.textMuted }]}
                  >
                    {item.description}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.app.textSubtle} />
            </View>
          </Card>
        )}
      />

      {canManage() ? (
        <FAB icon="plus" style={[styles.fab, { bottom: clearance || spacing.lg }]} onPress={() => router.push('/teams/new')} />
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
  description: { fontFamily: fontFamily.body, fontSize: fontSize.sm, lineHeight: 18 },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg },
});
