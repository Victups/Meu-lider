import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button } from 'react-native-paper';
import { addDays, format, isSameDay, nextSunday, nextWednesday, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { Sheet } from '@/components/ui';
import { fontFamily, fontSize, radius, spacing } from '@/theme';
import { useAppTheme } from '@/theme/use-app-theme';

interface DateTimeFieldProps {
  label: string;
  value: Date;
  onChange: (next: Date) => void;
  minimumDate?: Date;
  shortcuts?: boolean;
}

/** Church events cluster on a few weekdays, so these cover most of the cases. */
function quickDates(from: Date) {
  const base = startOfDay(from);
  return [
    { label: 'Hoje', date: base },
    { label: 'Amanhã', date: addDays(base, 1) },
    { label: 'Quarta', date: nextWednesday(base) },
    { label: 'Domingo', date: nextSunday(base) },
  ];
}

function withDate(value: Date, day: Date): Date {
  const merged = new Date(day);
  merged.setHours(value.getHours(), value.getMinutes(), 0, 0);
  return merged;
}

export function DateTimeField({
  label,
  value,
  onChange,
  minimumDate,
  shortcuts = true,
}: DateTimeFieldProps) {
  const theme = useAppTheme();
  const [sheet, setSheet] = useState<'date' | 'time' | null>(null);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.block}>
        <Text style={[styles.label, { color: theme.app.textMuted }]}>{label}</Text>
        <input
          type="datetime-local"
          value={format(value, "yyyy-MM-dd'T'HH:mm")}
          min={minimumDate ? format(minimumDate, "yyyy-MM-dd'T'HH:mm") : undefined}
          onChange={(event) => {
            const parsed = new Date(event.target.value);
            if (!Number.isNaN(parsed.getTime())) onChange(parsed);
          }}
          style={{
            padding: spacing.md,
            borderRadius: radius.sm,
            border: `1px solid ${theme.app.borderStrong}`,
            background: theme.app.surface,
            color: theme.app.text,
            fontSize: fontSize.md,
            fontFamily: 'Inter_400Regular',
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.block}>
      <Text style={[styles.label, { color: theme.app.textMuted }]}>{label}</Text>

      {shortcuts ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.shortcuts}
        >
          {quickDates(minimumDate ?? new Date()).map((option) => {
            const active = isSameDay(option.date, value);
            return (
              <Pressable
                key={option.label}
                onPress={() => onChange(withDate(value, option.date))}
                style={[
                  styles.shortcut,
                  {
                    backgroundColor: active ? theme.colors.primary : theme.app.surfaceSunken,
                    borderColor: active ? theme.colors.primary : theme.app.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.shortcutText,
                    { color: active ? theme.colors.onPrimary : theme.app.textMuted },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <View style={styles.row}>
        <Pressable
          onPress={() => setSheet('date')}
          style={[
            styles.trigger,
            styles.triggerDate,
            { borderColor: theme.app.borderStrong, backgroundColor: theme.app.surface },
          ]}
        >
          <Ionicons name="calendar-outline" size={17} color={theme.colors.primary} />
          <Text style={[styles.value, { color: theme.app.text }]}>
            {format(value, "d 'de' MMM", { locale: ptBR })}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setSheet('time')}
          style={[
            styles.trigger,
            { borderColor: theme.app.borderStrong, backgroundColor: theme.app.surface },
          ]}
        >
          <Ionicons name="time-outline" size={17} color={theme.colors.primary} />
          <Text style={[styles.value, { color: theme.app.text }]}>{format(value, 'HH:mm')}</Text>
        </Pressable>
      </View>

      {/* In a sheet, not inline: an inline picker pushes the rest of the form
          down and has nowhere to close, which made long forms unusable. */}
      <Sheet
        visible={sheet !== null}
        onDismiss={() => setSheet(null)}
        title={sheet === 'time' ? 'Horário' : 'Data'}
        subtitle={format(value, "EEEE, d 'de' MMMM 'às' HH'h'mm", { locale: ptBR })}
        footer={
          <Button mode="contained" onPress={() => setSheet(null)} style={styles.done}>
            Pronto
          </Button>
        }
      >
        <View style={styles.pickerHost}>
          <DateTimePicker
            value={value}
            mode={sheet === 'time' ? 'time' : 'date'}
            display={Platform.OS === 'ios' ? (sheet === 'time' ? 'spinner' : 'inline') : 'default'}
            minimumDate={sheet === 'date' ? minimumDate : undefined}
            locale="pt-BR"
            onValueChange={(_event, selected) => {
              if (sheet === 'date') {
                onChange(withDate(value, selected));
                // Android's dialog closes itself; keep the sheet in step.
                if (Platform.OS === 'android') setSheet(null);
                return;
              }

              const merged = new Date(value);
              merged.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
              onChange(merged);
              if (Platform.OS === 'android') setSheet(null);
            }}
            onDismiss={() => setSheet(null)}
          />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  label: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm },
  shortcuts: { gap: spacing.sm, paddingVertical: 2 },
  shortcut: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  shortcutText: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  triggerDate: { flex: 1 },
  value: { fontFamily: fontFamily.body, fontSize: fontSize.md },
  pickerHost: { alignItems: 'center', minHeight: 120 },
  done: { flex: 1, borderRadius: radius.md },
});
