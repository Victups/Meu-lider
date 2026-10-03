import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../../theme';
import { useAppTheme } from '../../theme/use-app-theme';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  /** Skip the top inset when a navigation header already covers it. */
  edgeToEdgeTop?: boolean;
}

export function Screen({ children, scroll = false, padded = true, edgeToEdgeTop = false }: ScreenProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const style = [
    styles.base,
    { backgroundColor: theme.app.canvas },
    padded && styles.padded,
    { paddingTop: edgeToEdgeTop ? 0 : insets.top, paddingBottom: insets.bottom },
  ];

  if (scroll) {
    return (
      <ScrollView
        style={{ backgroundColor: theme.app.canvas }}
        contentContainerStyle={style}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    );
  }

  return <View style={style}>{children}</View>;
}

const styles = StyleSheet.create({
  base: { flex: 1 },
  padded: { paddingHorizontal: spacing.lg },
});
