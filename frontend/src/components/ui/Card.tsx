import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { radius, spacing } from '../../theme';
import { useAppTheme } from '../../theme/use-app-theme';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  /** Vertical colour strip on the left edge — used to tint a card by team. */
  accentColor?: string | null;
  style?: ViewStyle;
  /** Position in a list: the first few cards ease in one after another. */
  index?: number;
}

/** Cards beyond this position just appear, so scrolling a long list never feels busy. */
const STAGGERED_CARDS = 8;
const STAGGER_MS = 45;

export function Card({ children, onPress, accentColor, style, index }: CardProps) {
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

  const body = onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  ) : (
    content
  );

  if (index !== undefined && index >= STAGGERED_CARDS) return body;

  return (
    <Animated.View entering={FadeInDown.duration(260).delay((index ?? 0) * STAGGER_MS)}>
      {body}
    </Animated.View>
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
  // A touch smaller and lighter while pressed, like a physical button.
  pressed: { opacity: 0.8, transform: [{ scale: 0.985 }] },
});
