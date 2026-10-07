import { StyleSheet, Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, StatusBadge } from '../ui';
import { hasStarted, holdsSlot, statusLabel } from '../../lib/schedule';
import { fontFamily, fontSize, radius, spacing } from '../../theme';
import { useAppTheme } from '../../theme/use-app-theme';
import type { Schedule } from '../../types';

interface ScheduleCardProps {
  schedule: Schedule;
  /** Offered only while the member still holds an upcoming slot. */
  onRequestRelease?: () => void;
  /** Trade this date with a colleague, without going through a leader. */
  onRequestSwap?: () => void;
  busy?: boolean;
}

export function ScheduleCard({ schedule, onRequestRelease, onRequestSwap, busy }: ScheduleCardProps) {
  const theme = useAppTheme();
  const { event, team, teamRole, status, releaseReason } = schedule;

  const eventDate = event ? new Date(event.eventDate) : null;
  const canAct = holdsSlot(schedule) && !hasStarted(schedule);
  const awaitingLeader = status === 'RELEASE_REQUESTED';

  return (
    <Card accentColor={team?.color}>
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <Text style={[styles.eventName, { color: theme.app.text }]}>
            {event?.name ?? 'Evento'}
          </Text>
          {eventDate ? (
            <Text style={[styles.date, { color: theme.app.textMuted }]}>
              {format(eventDate, "EEEE, d 'de' MMMM 'às' HH'h'mm", { locale: ptBR })}
            </Text>
          ) : null}
        </View>
        <StatusBadge status={status} label={statusLabel(schedule)} />
      </View>

      <View style={[styles.roleRow, { borderTopColor: theme.app.border }]}>
        <Text style={[styles.roleLabel, { color: theme.app.textMuted }]}>
          {team?.name ?? 'Equipe'}
        </Text>
        <Text style={[styles.roleValue, { color: theme.app.text }]}>
          {teamRole?.name ?? 'Função'}
        </Text>
      </View>

      {awaitingLeader ? (
        <View style={[styles.notice, { backgroundColor: theme.app.status.RELEASE_REQUESTED.bg }]}>
          <Text style={[styles.noticeText, { color: theme.app.status.RELEASE_REQUESTED.fg }]}>
            Aguardando a liderança liberar. Até lá, você segue escalado.
          </Text>
          {releaseReason ? (
            <Text style={[styles.noticeReason, { color: theme.app.status.RELEASE_REQUESTED.fg }]}>
              “{releaseReason}”
            </Text>
          ) : null}
        </View>
      ) : null}

      {canAct && (onRequestSwap || onRequestRelease) ? (
        <View style={styles.actions}>
          {onRequestSwap ? (
            <Button
              mode="contained-tonal"
              onPress={onRequestSwap}
              disabled={busy}
              style={styles.action}
              icon="swap-horizontal"
            >
              Trocar
            </Button>
          ) : null}
          {onRequestRelease ? (
            <Button
              mode="outlined"
              onPress={onRequestRelease}
              disabled={busy}
              style={styles.action}
              icon="calendar-remove-outline"
            >
              Não vou poder
            </Button>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  titleBlock: { flex: 1, gap: 2 },
  eventName: { fontFamily: fontFamily.displayMedium, fontSize: fontSize.lg },
  date: { fontFamily: fontFamily.body, fontSize: fontSize.sm, textTransform: 'capitalize' },
  roleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  roleLabel: { fontFamily: fontFamily.body, fontSize: fontSize.sm },
  roleValue: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.sm },
  notice: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.sm, gap: 2 },
  noticeText: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, lineHeight: 18 },
  noticeReason: { fontFamily: fontFamily.body, fontSize: fontSize.xs, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  action: { flex: 1, borderRadius: radius.md },
});
