import { Stack } from 'expo-router';
import { useAppTheme } from '@/theme/use-app-theme';

export default function AuthLayout() {
  const theme = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.app.canvas },
      }}
    />
  );
}
