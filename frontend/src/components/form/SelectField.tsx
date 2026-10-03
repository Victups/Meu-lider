import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Menu } from 'react-native-paper';
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
      <Menu
        visible={open}
        onDismiss={() => setOpen(false)}
        anchor={
          <Pressable
            onPress={() => !isEmpty && setOpen(true)}
            style={[
              styles.trigger,
              {
                borderColor: theme.app.borderStrong,
                backgroundColor: theme.app.surface,
                opacity: isEmpty ? 0.6 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.value,
                { color: selected ? theme.app.text : theme.app.textSubtle },
              ]}
            >
              {isEmpty ? emptyMessage : (selected?.label ?? placeholder)}
            </Text>
            <Ionicons name="chevron-down" size={18} color={theme.app.textSubtle} />
          </Pressable>
        }
      >
        {options.map((option) => (
          <Menu.Item
            key={option.value}
            title={option.label}
            onPress={() => {
              onSelect(option.value);
              setOpen(false);
            }}
          />
        ))}
      </Menu>
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
});
