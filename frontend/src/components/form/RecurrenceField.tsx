import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  MONTH_POSITIONS,
  WEEKDAY_LABEL,
  describeRecurrence,
  type MonthPosition,
  type RecurrenceKind,
  type RecurrenceSelection,
} from '@/lib/recurrence';
import { fontFamily, fontSize, radius, spacing } from '@/theme';
import { useAppTheme } from '@/theme/use-app-theme';

interface RecurrenceFieldProps {
  value: RecurrenceSelection;
  onChange: (next: RecurrenceSelection) => void;
}

const KINDS: { value: RecurrenceKind; label: string }[] = [
  { value: 'none', label: 'Não repete' },
  { value: 'weekly', label: 'Toda semana' },
  { value: 'monthly-nth', label: 'Por semana do mês' },
];

export function RecurrenceField({ value, onChange }: RecurrenceFieldProps) {
  const theme = useAppTheme();
  const weekday = WEEKDAY_LABEL[value.weekday];

  return (
    <View style={styles.block}>
      <Text style={[styles.label, { color: theme.app.textMuted }]}>Repetição</Text>

      <View style={styles.kinds}>
        {KINDS.map((kind) => {
          const active = kind.value === value.kind;
          return (
            <Pressable
              key={kind.value}
              onPress={() => onChange({ ...value, kind: kind.value })}
              style={[
                styles.kind,
                {
                  backgroundColor: active ? theme.colors.primary : theme.app.surfaceSunken,
                  borderColor: active ? theme.colors.primary : theme.app.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.kindText,
                  { color: active ? theme.colors.onPrimary : theme.app.textMuted },
                ]}
              >
                {kind.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {value.kind === 'monthly-nth' ? (
        <>
          <Text style={[styles.hint, { color: theme.app.textSubtle }]}>
            Qual {weekday} do mês
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.positions}>
            {MONTH_POSITIONS.map((position) => {
              const active = position.value === value.position;
              return (
                <Pressable
                  key={position.value}
                  onPress={() => onChange({ ...value, position: position.value as MonthPosition })}
                  style={[
                    styles.position,
                    {
                      backgroundColor: active ? theme.colors.primaryContainer : 'transparent',
                      borderColor: active ? theme.colors.primary : theme.app.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.positionText,
                      { color: active ? theme.colors.onPrimaryContainer : theme.app.textMuted },
                    ]}
                  >
                    {position.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      ) : null}

      {value.kind !== 'none' ? (
        <Text style={[styles.summary, { color: theme.colors.primary }]}>
          {describeRecurrence(value)} · o dia da semana vem da data escolhida
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  label: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm },
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  kind: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  kindText: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs },
  hint: { fontFamily: fontFamily.body, fontSize: fontSize.xs, marginTop: spacing.xs },
  positions: { gap: spacing.sm, paddingVertical: 2 },
  position: {
    minWidth: 52,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  positionText: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs },
  summary: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, marginTop: spacing.xs },
});
