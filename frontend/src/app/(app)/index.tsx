import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator } from 'react-native-paper';
import { Card, EmptyState, Screen } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { useAuthStore } from '@/stores/auth';
import { useChurchStore } from '@/stores/church';
import { fontFamily, fontSize, spacing } from '@/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import type { Church } from '@/types';

export default function HomeScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { churches, loadChurches, selectChurch, isLoading } = useChurchStore();

  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      await loadChurches();
    } catch (err) {
      setError(toUserMessage(err));
    }
  }, [loadChurches]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openChurch = (church: Church) => {
    selectChurch(church);
    router.push('/schedules');
  };

  if (isLoading && churches.length === 0) {
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
        <Text style={[styles.greeting, { color: theme.app.textMuted }]}>Olá,</Text>
        <Text style={[styles.name, { color: theme.app.text }]}>{user?.name ?? 'bem-vindo'}</Text>
      </View>

      <FlatList
        data={churches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={churches.length === 0 ? styles.emptyList : styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState
            icon={error ? 'cloud-offline-outline' : 'home-outline'}
            title={error ? 'Não foi possível carregar' : 'Nenhuma igreja ainda'}
            description={
              error ?? 'Você precisa ser convidado por uma igreja para ver as escalas por aqui.'
            }
            actionLabel={error ? 'Tentar de novo' : undefined}
            onAction={error ? load : undefined}
          />
        }
        renderItem={({ item }) => (
          <Card onPress={() => openChurch(item)} style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.cardText}>
                <Text style={[styles.churchName, { color: theme.app.text }]}>{item.name}</Text>
                {item.description ? (
                  <Text
                    numberOfLines={2}
                    style={[styles.churchDescription, { color: theme.app.textMuted }]}
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg },
  greeting: { fontFamily: fontFamily.body, fontSize: fontSize.sm },
  name: { fontFamily: fontFamily.display, fontSize: fontSize.xxl, marginTop: 2 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  emptyList: { flexGrow: 1 },
  card: {},
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardText: { flex: 1, gap: 2 },
  churchName: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.md },
  churchDescription: { fontFamily: fontFamily.body, fontSize: fontSize.sm, lineHeight: 18 },
});
