import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fontFamily, fontSize, radius, spacing } from '../../theme';
import { useAppTheme } from '../../theme/use-app-theme';

interface RoleChipProps {
  label: string;
  /** Shown after the label, e.g. how many slots the position needs. */
  count?: number;
  selected?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
}

export function RoleChip({ label, count, selected, onPress, onRemove }: RoleChipProps) {
  const theme = useAppTheme();

  const background = selected ? theme.colors.primaryContainer : theme.app.surfaceSunken;
  const foreground = selected ? theme.colors.onPrimaryContainer : theme.app.textMuted;

  const content = (
    <View style={[styles.chip, { backgroundColor: background, borderColor: theme.app.border }]}>
      <Text style={[styles.label, { color: foreground }]}>{label}</Text>
      {count !== undefined ? (
        <View style={[styles.count, { backgroundColor: theme.app.surface }]}>
          <Text style={[styles.countText, { color: theme.app.textMuted }]}>{count}</Text>
        </View>
      ) : null}
      {onRemove ? (
        <Pressable onPress={onRemove} hitSlop={8} accessibilityLabel={`Remover ${label}`}>
          <Ionicons name="close" size={14} color={foreground} />
        </Pressable>
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm },
  count: {
    minWidth: 20,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  countText: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.xs },
  pressed: { opacity: 0.6 },
});
