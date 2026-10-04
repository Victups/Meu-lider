import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { fontFamily, fontSize, radius, spacing } from '@/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import type { Event } from '@/types';

interface MonthCalendarProps {
  month: Date;
  onMonthChange: (next: Date) => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  events: Event[];
}

const WEEKDAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
/** More dots than this would not fit in a cell, so the rest are implied. */
const MAX_DOTS = 3;

export function MonthCalendar({
  month,
  onMonthChange,
  selectedDate,
  onSelectDate,
  events,
}: MonthCalendarProps) {
  const theme = useAppTheme();

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const event of events) {
      const key = format(new Date(event.eventDate), 'yyyy-MM-dd');
      const bucket = map.get(key) ?? [];
      bucket.push(event);
      map.set(key, bucket);
    }
    return map;
  }, [events]);

  return (
    <View style={styles.container}>
      <View style={styles.monthBar}>
        <Pressable
          onPress={() => onMonthChange(subMonths(month, 1))}
          hitSlop={12}
          accessibilityLabel="Mês anterior"
        >
          <Ionicons name="chevron-back" size={22} color={theme.colors.primary} />
        </Pressable>

        <Text style={[styles.monthLabel, { color: theme.app.text }]}>
          {format(month, "MMMM 'de' yyyy", { locale: ptBR })}
        </Text>

        <Pressable
          onPress={() => onMonthChange(addMonths(month, 1))}
          hitSlop={12}
          accessibilityLabel="Próximo mês"
        >
          <Ionicons name="chevron-forward" size={22} color={theme.colors.primary} />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAY_LABELS.map((label, index) => (
          <Text
            key={`${label}-${index}`}
            style={[styles.weekLabel, { color: theme.app.textSubtle }]}
          >
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDay.get(key) ?? [];
          const selected = isSameDay(day, selectedDate);
          const outside = !isSameMonth(day, month);

          const textColor = selected
            ? theme.colors.onPrimary
            : outside
              ? theme.app.textSubtle
              : theme.app.text;

          return (
            <Pressable
              key={key}
              onPress={() => onSelectDate(day)}
              style={styles.cell}
              accessibilityRole="button"
              accessibilityLabel={format(day, "d 'de' MMMM", { locale: ptBR })}
            >
              <View
                style={[
                  styles.dayCircle,
                  selected && { backgroundColor: theme.colors.primary },
                  !selected &&
                    isToday(day) && { borderColor: theme.colors.primary, borderWidth: 1 },
                ]}
              >
                <Text style={[styles.dayText, { color: textColor }]}>{format(day, 'd')}</Text>
              </View>

              <View style={styles.dots}>
                {dayEvents.slice(0, MAX_DOTS).map((event) => (
                  <View
                    key={event.id}
                    style={[
                      styles.dot,
                      { backgroundColor: selected ? theme.colors.primary : theme.app.accent },
                    ]}
                  />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  monthLabel: {
    fontFamily: fontFamily.displayMedium,
    fontSize: fontSize.lg,
    textTransform: 'capitalize',
  },
  weekRow: { flexDirection: 'row' },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.xs,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: spacing.xs },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm },
  dots: { flexDirection: 'row', gap: 3, height: 6, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
