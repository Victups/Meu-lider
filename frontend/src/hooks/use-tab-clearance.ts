import { useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/theme';
import { FLOATING_TAB_BAR, TAB_BAR_HEIGHT, tabBarBottom } from '@/theme/tab-bar';

/**
 * Bottom space a screen must leave for the floating tab bar, so the last item of a list can be
 * scrolled clear of it (the list itself runs underneath the glass). Zero where the bar is the
 * regular one (Android) and outside the tabs.
 */
export function useTabClearance(): number {
  const insets = useSafeAreaInsets();
  const inTabs = useSegments()[0] === '(app)';

  return FLOATING_TAB_BAR && inTabs
    ? tabBarBottom(insets.bottom) + TAB_BAR_HEIGHT + spacing.md
    : 0;
}

