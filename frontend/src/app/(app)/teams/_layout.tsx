import { Stack } from 'expo-router';
import { fontFamily } from '@/theme';
import { useAppTheme } from '@/theme/use-app-theme';

export default function TeamsLayout() {
  const theme = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.app.surface },
        headerTintColor: theme.app.text,
        headerTitleStyle: { fontFamily: fontFamily.displayMedium },
        contentStyle: { backgroundColor: theme.app.canvas },
      }}
    >
      {/* The title doubles as the back-button label on the next screen. */}
      <Stack.Screen name="index" options={{ headerShown: false, title: 'Equipes' }} />
      <Stack.Screen name="new" options={{ title: 'Nova equipe', presentation: 'modal' }} />
      <Stack.Screen name="[teamId]" options={{ title: 'Equipe' }} />
    </Stack>
  );
}
