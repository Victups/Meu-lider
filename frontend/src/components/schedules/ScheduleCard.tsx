import { StyleSheet, Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, StatusBadge } from '../ui';
import { fontFamily, fontSize, spacing } from '../../theme';
import { useAppTheme } from '../../theme/use-app-theme';
import type { Schedule } from '../../types';

interface ScheduleCardProps {
  schedule: Schedule;
  onConfirm?: () => void;
  onDecline?: () => void;
  busy?: boolean;
}

export function ScheduleCard({ schedule, onConfirm, onDecline, busy }: ScheduleCardProps) {
  const theme = useAppTheme();
  const { event, team, teamRole, status } = schedule;

  const eventDate = event ? new Date(event.eventDate) : null;
  const awaitingAnswer = status === 'PENDING' && (onConfirm || onDecline);

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
        <StatusBadge status={status} />
      </View>

      <View style={[styles.roleRow, { borderTopColor: theme.app.border }]}>
        <Text style={[styles.roleLabel, { color: theme.app.textMuted }]}>
          {team?.name ?? 'Equipe'}
        </Text>
        <Text style={[styles.roleValue, { color: theme.app.text }]}>
          {teamRole?.name ?? 'Função'}
        </Text>
      </View>

      {awaitingAnswer ? (
        <View style={styles.actions}>
          <Button mode="contained" onPress={onConfirm} disabled={busy} style={styles.action}>
            Confirmar
          </Button>
          <Button mode="outlined" onPress={onDecline} disabled={busy} style={styles.action}>
            Não posso
          </Button>
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
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  action: { flex: 1 },
});
