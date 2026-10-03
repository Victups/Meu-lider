import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { radius, spacing } from '../../theme';
import { useAppTheme } from '../../theme/use-app-theme';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  /** Vertical colour strip on the left edge — used to tint a card by team. */
  accentColor?: string | null;
  style?: ViewStyle;
}

export function Card({ children, onPress, accentColor, style }: CardProps) {
  const theme = useAppTheme();

  const surface: ViewStyle = {
    backgroundColor: theme.app.surface,
    borderColor: theme.app.border,
  };

  const content = (
    <View style={[styles.card, surface, style]}>
      {accentColor ? <View style={[styles.accent, { backgroundColor: accentColor }]} /> : null}
      <View style={styles.body}>{children}</View>
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
  card: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  accent: { width: 4 },
  body: { flex: 1, padding: spacing.lg },
  pressed: { opacity: 0.7 },
});
