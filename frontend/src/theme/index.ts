import { MD3DarkTheme, MD3LightTheme, configureFonts } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';
import { palette } from './palette';
import { fontFamily, fontSize, radius, spacing } from './tokens';
import type { ScheduleStatus } from '../types/schedule';

export { palette } from './palette';
export { spacing, radius, fontFamily, fontSize } from './tokens';

type StatusTone = { fg: string; bg: string };

export interface AppColors {
  canvas: string;
  surface: string;
  surfaceSunken: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  accent: string;
  status: Record<ScheduleStatus, StatusTone>;
}

export interface AppTheme extends MD3Theme {
  app: AppColors;
}

const fontConfig = configureFonts({
  config: {
    displayLarge: { fontFamily: fontFamily.display, fontSize: fontSize.xxxl, lineHeight: 42, fontWeight: '700' },
    headlineMedium: { fontFamily: fontFamily.display, fontSize: fontSize.xxl, lineHeight: 36, fontWeight: '700' },
    headlineSmall: { fontFamily: fontFamily.displayMedium, fontSize: fontSize.xl, lineHeight: 28, fontWeight: '600' },
    titleMedium: { fontFamily: fontFamily.bodyBold, fontSize: fontSize.md, lineHeight: 24, fontWeight: '600' },
    bodyLarge: { fontFamily: fontFamily.body, fontSize: fontSize.md, lineHeight: 24, fontWeight: '400' },
    bodyMedium: { fontFamily: fontFamily.body, fontSize: fontSize.sm, lineHeight: 20, fontWeight: '400' },
    labelLarge: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.sm, lineHeight: 20, fontWeight: '500' },
    labelSmall: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs, lineHeight: 16, fontWeight: '500' },
  },
});

export const lightTheme: AppTheme = {
  ...MD3LightTheme,
  roundness: radius.md,
  fonts: fontConfig,
  colors: {
    ...MD3LightTheme.colors,
    primary: palette.indigo[500],
    onPrimary: palette.sand[0],
    primaryContainer: palette.indigo[50],
    onPrimaryContainer: palette.indigo[800],
    secondary: palette.amber[500],
    onSecondary: palette.sand[0],
    secondaryContainer: palette.amber[50],
    onSecondaryContainer: palette.amber[800],
    background: palette.sand[50],
    onBackground: palette.sand[900],
    surface: palette.sand[0],
    onSurface: palette.sand[900],
    surfaceVariant: palette.sand[100],
    onSurfaceVariant: palette.sand[600],
    outline: palette.sand[300],
    outlineVariant: palette.sand[200],
    error: palette.red[500],
    onError: palette.sand[0],
    errorContainer: palette.red[100],
    onErrorContainer: palette.red[700],
  },
  app: {
    canvas: palette.sand[50],
    surface: palette.sand[0],
    surfaceSunken: palette.sand[100],
    border: palette.sand[200],
    borderStrong: palette.sand[300],
    text: palette.sand[900],
    textMuted: palette.sand[600],
    textSubtle: palette.sand[400],
    accent: palette.amber[500],
    status: {
      SCHEDULED: { fg: palette.indigo[700], bg: palette.indigo[50] },
      RELEASE_REQUESTED: { fg: palette.amber[700], bg: palette.amber[100] },
      CONFIRMED: { fg: palette.green[700], bg: palette.green[100] },
      CANCELLED: { fg: palette.red[700], bg: palette.red[100] },
      NO_SHOW: { fg: palette.sand[700], bg: palette.sand[200] },
    },
  },
};

export const darkTheme: AppTheme = {
  ...MD3DarkTheme,
  roundness: radius.md,
  fonts: fontConfig,
  colors: {
    ...MD3DarkTheme.colors,
    primary: palette.indigo[300],
    onPrimary: palette.indigo[900],
    primaryContainer: palette.indigo[800],
    onPrimaryContainer: palette.indigo[100],
    secondary: palette.amber[300],
    onSecondary: palette.amber[900],
    secondaryContainer: palette.amber[800],
    onSecondaryContainer: palette.amber[100],
    background: palette.sand[950],
    onBackground: palette.sand[100],
    surface: palette.sand[900],
    onSurface: palette.sand[100],
    surfaceVariant: palette.sand[800],
    onSurfaceVariant: palette.sand[400],
    outline: palette.sand[700],
    outlineVariant: palette.sand[800],
    error: palette.red[300],
    onError: palette.red[700],
    errorContainer: palette.red[700],
    onErrorContainer: palette.red[100],
  },
  app: {
    canvas: palette.sand[950],
    surface: palette.sand[900],
    surfaceSunken: palette.sand[800],
    border: palette.sand[800],
    borderStrong: palette.sand[700],
    text: palette.sand[100],
    textMuted: palette.sand[400],
    textSubtle: palette.sand[500],
    accent: palette.amber[300],
    status: {
      SCHEDULED: { fg: palette.indigo[100], bg: palette.indigo[800] },
      RELEASE_REQUESTED: { fg: palette.amber[200], bg: palette.amber[800] },
      CONFIRMED: { fg: palette.green[300], bg: palette.green[700] },
      CANCELLED: { fg: palette.red[300], bg: palette.red[700] },
      NO_SHOW: { fg: palette.sand[300], bg: palette.sand[700] },
    },
  },
};

