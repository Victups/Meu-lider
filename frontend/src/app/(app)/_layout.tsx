import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fontFamily, fontSize } from '@/theme';
import { useAppTheme } from '@/theme/use-app-theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

const TABS: { name: string; title: string; icon: IoniconName }[] = [
  { name: 'index', title: 'Início', icon: 'home-outline' },
  { name: 'schedules', title: 'Escalas', icon: 'checkmark-circle-outline' },
  { name: 'events', title: 'Eventos', icon: 'calendar-outline' },
  { name: 'teams', title: 'Equipes', icon: 'people-outline' },
  { name: 'profile', title: 'Perfil', icon: 'person-outline' },
];

export default function AppTabsLayout() {
  const theme = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.app.textSubtle,
        tabBarStyle: {
          backgroundColor: theme.app.surface,
          borderTopColor: theme.app.border,
        },
        tabBarLabelStyle: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs },
      }}
    >
      {TABS.map(({ name, title, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, size }) => <Ionicons name={icon} size={size} color={color} />,
          }}
        />
      ))}

      {/* Reached from the profile, not from the tab bar. */}
      <Tabs.Screen name="availability" options={{ href: null }} />
      <Tabs.Screen name="church-settings" options={{ href: null }} />
    </Tabs>
  );
}
