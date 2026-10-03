import { StyleSheet, Text, View } from 'react-native';
import { fontFamily, radius } from '../../theme';
import { useAppTheme } from '../../theme/use-app-theme';

interface AvatarProps {
  name: string;
  size?: number;
  color?: string | null;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export function Avatar({ name, size = 44, color }: AvatarProps) {
  const theme = useAppTheme();
  const background = color ?? theme.colors.primaryContainer;

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: radius.pill, backgroundColor: background },
      ]}
    >
      <Text
        style={[styles.initials, { fontSize: size * 0.36, color: theme.colors.onPrimaryContainer }]}
      >
        {initialsOf(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: fontFamily.bodyBold, letterSpacing: 0.3 },
});
