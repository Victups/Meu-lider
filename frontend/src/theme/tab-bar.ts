import { Platform } from 'react-native';
import { spacing } from './tokens';

/**
 * The floating "liquid glass" bar is the iOS look (and what an iPhone PWA runs on, i.e. web).
 * Android keeps the regular Material bar glued to the bottom.
 */
export const FLOATING_TAB_BAR = Platform.OS !== 'android';

export const TAB_BAR_HEIGHT = 64;
export const TAB_BAR_SIDE_MARGIN = 24;

/** Distance from the screen's bottom edge; sits just above the home indicator. */
export const tabBarBottom = (insetBottom: number): number => Math.max(insetBottom - 12, spacing.md);
