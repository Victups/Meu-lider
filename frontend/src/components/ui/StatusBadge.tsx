import { StyleSheet, Text, View } from 'react-native';
import { fontFamily, fontSize, radius, spacing } from '../../theme';
import { useAppTheme } from '../../theme/use-app-theme';
import { SCHEDULE_STATUS_LABEL, type ScheduleStatus } from '../../types/schedule';

interface StatusBadgeProps {
  status: ScheduleStatus;
  /** Overrides the default wording, e.g. "Presente" once the event happened. */
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const theme = useAppTheme();
  const tone = theme.app.status[status];

  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
      <View style={[styles.dot, { backgroundColor: tone.fg }]} />
      <Text style={[styles.label, { color: tone.fg }]}>{label ?? SCHEDULE_STATUS_LABEL[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.xs, letterSpacing: 0.2 },
});
