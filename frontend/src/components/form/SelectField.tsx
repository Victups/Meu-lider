import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { fontFamily, fontSize, radius, spacing } from '@/theme';
import { useAppTheme } from '@/theme/use-app-theme';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  placeholder?: string;
  value: string | null;
  options: SelectOption[];
  onSelect: (value: string) => void;
  emptyMessage?: string;
}

const LIST_MAX_HEIGHT = 224;

/**
 * Dropdown that opens inline, right under the field. It deliberately avoids Paper's Menu: that one
 * renders in a Portal outside the screen, so inside a Sheet (a native Modal) the options can end
 * up behind the Sheet and never show.
 */
export function SelectField({
  label,
  placeholder = 'Selecione',
  value,
  options,
  onSelect,
  emptyMessage = 'Nenhuma opção disponível',
}: SelectFieldProps) {
  const theme = useAppTheme();
  const [open, setOpen] = useState(false);

  const selected = options.find((option) => option.value === value);
  const isEmpty = options.length === 0;

  return (
    <View style={styles.block}>
      <Text style={[styles.label, { color: theme.app.textMuted }]}>{label}</Text>

      <Pressable
        onPress={() => !isEmpty && setOpen((current) => !current)}
        style={[
          styles.trigger,
          {
            borderColor: open ? theme.colors.primary : theme.app.borderStrong,
            backgroundColor: theme.app.surface,
            opacity: isEmpty ? 0.6 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={[styles.value, { color: selected ? theme.app.text : theme.app.textSubtle }]}>
          {isEmpty ? emptyMessage : (selected?.label ?? placeholder)}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={theme.app.textSubtle} />
      </Pressable>

      {open && !isEmpty ? (
        <Animated.View
          entering={FadeIn.duration(140)}
          style={[styles.list, { borderColor: theme.app.border, backgroundColor: theme.app.surface }]}
        >
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={styles.scroll}>
            {options.map((option) => {
              const active = option.value === value;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    onSelect(option.value);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.option,
                    (active || pressed) && { backgroundColor: theme.colors.primaryContainer },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: active ? theme.colors.onPrimaryContainer : theme.app.text },
                      active && { fontFamily: fontFamily.bodyBold },
                    ]}
                  >
                    {option.label}
                  </Text>
                  {active ? <Ionicons name="checkmark" size={18} color={theme.colors.primary} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.xs },
  label: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  value: { fontFamily: fontFamily.body, fontSize: fontSize.md, flex: 1 },
  list: { borderWidth: 1, borderRadius: radius.sm, overflow: 'hidden' },
  scroll: { maxHeight: LIST_MAX_HEIGHT },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  optionText: { fontFamily: fontFamily.body, fontSize: fontSize.md, flex: 1 },
});
