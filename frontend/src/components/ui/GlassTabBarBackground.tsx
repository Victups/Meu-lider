import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { TAB_BAR_HEIGHT } from '../../theme/tab-bar';
import { useAppTheme } from '../../theme/use-app-theme';

/** "Liquid glass" pill for the floating tab bar: real blur, a clear rim and a soft shadow. */
export function GlassTabBarBackground() {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.shadow,
        {
          backgroundColor: theme.dark ? 'rgba(40,38,36,0.45)' : 'rgba(255,255,255,0.45)',
          shadowColor: theme.dark ? '#000' : '#2B1B2A',
        },
      ]}
    >
      <View
        style={[
          styles.clip,
          { borderColor: theme.dark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.85)' },
        ]}
      >
        <BlurView
          intensity={80}
          tint={theme.dark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      </View>
    </View>
  );
}

const RADIUS = TAB_BAR_HEIGHT / 2;

const styles = StyleSheet.create({
  shadow: {
    ...StyleSheet.absoluteFill,
    borderRadius: RADIUS,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 22,
  },
  clip: {
    ...StyleSheet.absoluteFill,
    borderRadius: RADIUS,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
