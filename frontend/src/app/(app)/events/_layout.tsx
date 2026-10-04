import { Stack } from 'expo-router';
import { fontFamily } from '@/theme';
import { useAppTheme } from '@/theme/use-app-theme';

export default function EventsLayout() {
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
      <Stack.Screen name="index" options={{ headerShown: false, title: 'Eventos' }} />
      <Stack.Screen name="new" options={{ title: 'Novo evento', presentation: 'modal' }} />
      {/* No back button: the edge swipe on iOS and the system button on Android already go back. */}
      <Stack.Screen name="[eventId]" options={{ title: 'Evento', headerBackVisible: false }} />
    </Stack>
  );
}
