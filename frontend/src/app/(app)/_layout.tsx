import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassTabBar } from '@/components/ui';
import { fontFamily, fontSize } from '@/theme';
import { FLOATING_TAB_BAR } from '@/theme/tab-bar';
import { useAppTheme } from '@/theme/use-app-theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

const TABS: { name: string; title: string; icon: IoniconName; iconActive: IoniconName }[] = [
  { name: 'index', title: 'Início', icon: 'home-outline', iconActive: 'home' },
  { name: 'schedules', title: 'Escalas', icon: 'checkmark-circle-outline', iconActive: 'checkmark-circle' },
  { name: 'events', title: 'Eventos', icon: 'calendar-outline', iconActive: 'calendar' },
  { name: 'teams', title: 'Equipes', icon: 'people-outline', iconActive: 'people' },
  { name: 'profile', title: 'Perfil', icon: 'person-outline', iconActive: 'person' },
];

export default function AppTabsLayout() {
  const theme = useAppTheme();

  return (
    <Tabs
      // iOS and web (iPhone PWA): a floating glass pill over the content (screens leave room for
      // it through useTabClearance). Android keeps the regular bar below.
      tabBar={
        FLOATING_TAB_BAR
          ? (props) => {
              const routes = TABS.flatMap((tab) => {
                const route = props.state.routes.find((r) => r.name === tab.name);
                return route ? [{ route, tab }] : [];
              });
              const focusedKey = props.state.routes[props.state.index]?.key;

              return (
                <GlassTabBar
                  items={routes.map(({ route, tab }) => ({
                    key: route.key,
                    label: tab.title,
                    icon: tab.icon,
                    iconActive: tab.iconActive,
                  }))}
                  activeIndex={routes.findIndex(({ route }) => route.key === focusedKey)}
                  onSelect={(index) => {
                    const { route } = routes[index];
                    const event = props.navigation.emit({
                      type: 'tabPress',
                      target: route.key,
                      canPreventDefault: true,
                    });
                    if (!event.defaultPrevented) props.navigation.navigate(route.name, route.params);
                  }}
                />
              );
            }
          : undefined
      }
      screenOptions={{
        headerShown: false,
        // Without this the scenes flash the navigator's default white between tab switches.
        sceneStyle: { backgroundColor: theme.app.canvas },
        animation: 'fade',
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.app.textSubtle,
        tabBarStyle: { backgroundColor: theme.app.surface, borderTopColor: theme.app.border },
        tabBarLabelStyle: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.xs },
        popToTopOnBlur: true,
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

      {/* Reached from the profile or the home, not from the tab bar. */}
      <Tabs.Screen name="availability" options={{ href: null }} />
      <Tabs.Screen name="church-settings" options={{ href: null }} />
      <Tabs.Screen name="agenda" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="swaps" options={{ href: null }} />
      <Tabs.Screen name="swap-request" options={{ href: null }} />
      <Tabs.Screen name="invitations" options={{ href: null }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
    </Tabs>
  );
}
