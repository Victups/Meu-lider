import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fontFamily, fontSize, radius, spacing } from '../../theme';
import { useAppTheme } from '../../theme/use-app-theme';

export interface ViewOption<T extends string> {
  value: T;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface ViewToggleProps<T extends string> {
  options: ViewOption<T>[];
  value: T;
  onChange: (next: T) => void;
}

export function ViewToggle<T extends string>({ options, value, onChange }: ViewToggleProps<T>) {
  const theme = useAppTheme();

  return (
    <View style={[styles.track, { backgroundColor: theme.app.surfaceSunken }]}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.segment, active && { backgroundColor: theme.app.surface }]}
          >
            <Ionicons
              name={option.icon}
              size={15}
              color={active ? theme.colors.primary : theme.app.textSubtle}
            />
            <Text
              style={[
                styles.label,
                { color: active ? theme.app.text : theme.app.textSubtle },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: 3, borderRadius: radius.pill, gap: 3 },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  label: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.xs },
});
