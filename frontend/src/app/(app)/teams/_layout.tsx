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
      <Stack.Screen name="index" options={{ headerShown: false, title: 'Equipes' }} />
      <Stack.Screen name="new" options={{ title: 'Nova equipe', presentation: 'modal' }} />
      {/* No back button: the edge swipe on iOS and the system button on Android already go back. */}
      <Stack.Screen name="[teamId]" options={{ title: 'Equipe', headerBackVisible: false }} />
    </Stack>
  );
}
