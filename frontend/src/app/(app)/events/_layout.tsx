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
      {/* The title doubles as the back-button label on the next screen. */}
      <Stack.Screen name="index" options={{ headerShown: false, title: 'Eventos' }} />
      <Stack.Screen name="new" options={{ title: 'Novo evento', presentation: 'modal' }} />
      <Stack.Screen name="[eventId]" options={{ title: 'Evento' }} />
    </Stack>
  );
}
