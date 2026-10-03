import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import { fontFamily, fontSize, radius, spacing } from '../../theme';
import { useAppTheme } from '../../theme/use-app-theme';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconRing, { backgroundColor: theme.colors.primaryContainer }]}>
        <Ionicons name={icon} size={30} color={theme.colors.onPrimaryContainer} />
      </View>
      <Text style={[styles.title, { color: theme.app.text }]}>{title}</Text>
      {description ? (
        <Text style={[styles.description, { color: theme.app.textMuted }]}>{description}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button mode="contained" onPress={onAction} style={styles.action}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  iconRing: {
    width: 68,
    height: 68,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: { fontFamily: fontFamily.display, fontSize: fontSize.lg, textAlign: 'center' },
  description: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  action: { marginTop: spacing.sm },
});
