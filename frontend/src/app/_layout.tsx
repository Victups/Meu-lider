import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { darkTheme, lightTheme } from '@/theme';
import { useAuthStore } from '@/stores/auth';
import { useNotifications } from '@/hooks/use-notifications';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? darkTheme : lightTheme;

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const segments = useSegments();
  const router = useRouter();
  const { user, isLoading, restoreSession } = useAuthStore();

  useNotifications();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (fontsLoaded && !isLoading) SplashScreen.hideAsync();
  }, [fontsLoaded, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';

    if (user && inAuthGroup) router.replace('/');
    else if (!user && !inAuthGroup) router.replace('/(auth)/login');
  }, [user, isLoading, segments, router]);

  if (!fontsLoaded || isLoading) return null;

  // The navigator paints its own white behind screens during transitions unless told otherwise.
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: { ...base.colors, background: theme.app.canvas, card: theme.app.surface, border: theme.app.border },
  };

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <ThemeProvider value={navigationTheme}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.app.canvas } }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
          </Stack>
        </ThemeProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
