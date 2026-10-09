import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabClearance } from '../../hooks/use-tab-clearance';
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
  // Inside the tabs the content runs under the floating bar; outside it respects the home indicator.
  const clearance = useTabClearance();

  const base = [
    { backgroundColor: theme.app.canvas },
    padded && styles.padded,
    { paddingTop: edgeToEdgeTop ? 0 : insets.top, paddingBottom: clearance > 0 ? 0 : insets.bottom },
  ];

  if (scroll) {
    return (
      <ScrollView
        style={[styles.fill, { backgroundColor: theme.app.canvas }]}
        contentContainerStyle={[styles.scrollContent, ...base, clearance > 0 && { paddingBottom: clearance + spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    );
  }

  return <View style={[styles.fill, ...base]}>{children}</View>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  padded: { paddingHorizontal: spacing.lg },
});
