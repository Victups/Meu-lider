import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, IconButton } from 'react-native-paper';
import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, Card, EmptyState, Screen } from '@/components/ui';
import { toUserMessage } from '@/lib/errors';
import { schedulesService } from '@/services';
import { useChurchStore } from '@/stores/church';
import { fontFamily, fontSize, spacing } from '@/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import { useTabClearance } from '@/hooks/use-tab-clearance';
import type { MemberParticipation } from '@/types';

function Stat({ value, label }: { value: number; label: string }) {
  const theme = useAppTheme();

  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: theme.app.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.app.textMuted }]}>{label}</Text>
    </View>
  );
}

/** Who carries the rota this month: served, missed and still ahead. */
export default function ReportsScreen() {
  const theme = useAppTheme();
  const clearance = useTabClearance();
  const currentChurch = useChurchStore((s) => s.currentChurch);

  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [rows, setRows] = useState<MemberParticipation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentChurch) return;
    try {
      setError(null);
      setRows(await schedulesService.participation(currentChurch.id, month, endOfMonth(month)));
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setLoading(false);
    }
  }, [currentChurch, month]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const totals = useMemo(
    () =>
      rows.reduce(
        (sum, row) => ({
          served: sum.served + row.served,
          noShow: sum.noShow + row.noShow,
          upcoming: sum.upcoming + row.upcoming,
        }),
        { served: 0, noShow: 0, upcoming: 0 },
      ),
    [rows],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.app.text }]}>Relatórios</Text>
        <View style={styles.monthRow}>
          <IconButton icon="chevron-left" onPress={() => setMonth((m) => addMonths(m, -1))} />
          <Text style={[styles.month, { color: theme.app.text }]}>{format(month, "MMMM 'de' yyyy", { locale: ptBR })}</Text>
          <IconButton icon="chevron-right" onPress={() => setMonth((m) => addMonths(m, 1))} />
        </View>
        <View style={[styles.totals, { backgroundColor: theme.app.surfaceSunken }]}>
          <Stat value={totals.served} label="serviram" />
          <Stat value={totals.noShow} label="faltas" />
          <Stat value={totals.upcoming} label="a vir" />
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.memberId}
          contentContainerStyle={[rows.length === 0 ? styles.emptyList : styles.list, clearance > 0 && { paddingBottom: clearance + spacing.lg }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <EmptyState
              icon={error ? 'cloud-offline-outline' : 'bar-chart-outline'}
              title={error ?? 'Sem escalas neste mês'}
            />
          }
          renderItem={({ item, index }) => (
            <Card index={index}>
              <View style={styles.row}>
                <Avatar name={item.fullName} size={40} />
                <Text style={[styles.name, { color: theme.app.text }]}>{item.fullName}</Text>
                <Stat value={item.served} label="serviu" />
                <Stat value={item.noShow} label="faltas" />
                <Stat value={item.upcoming} label="a vir" />
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
  title: { fontFamily: fontFamily.display, fontSize: fontSize.xxl },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  month: { fontFamily: fontFamily.displayMedium, fontSize: fontSize.lg, textTransform: 'capitalize' },
  totals: { flexDirection: 'row', justifyContent: 'space-around', padding: spacing.lg, borderRadius: 16 },
  list: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, gap: spacing.sm },
  emptyList: { flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { flex: 1, fontFamily: fontFamily.bodyBold, fontSize: fontSize.sm },
  stat: { alignItems: 'center', minWidth: 44 },
  statValue: { fontFamily: fontFamily.display, fontSize: fontSize.lg },
  statLabel: { fontFamily: fontFamily.body, fontSize: fontSize.xs },
});
