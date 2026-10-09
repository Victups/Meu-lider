import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontFamily } from '../../theme';
import { TAB_BAR_HEIGHT, TAB_BAR_SIDE_MARGIN, tabBarBottom } from '../../theme/tab-bar';
import { useAppTheme } from '../../theme/use-app-theme';
import { GlassTabBarBackground } from './GlassTabBarBackground';

type IconName = keyof typeof Ionicons.glyphMap;

export interface GlassTabItem {
  key: string;
  label: string;
  icon: IconName;
  iconActive: IconName;
}

interface GlassTabBarProps {
  items: GlassTabItem[];
  /** -1 when the current screen is not one of the tabs (the capsule hides). */
  activeIndex: number;
  onSelect: (index: number) => void;
}

const PAD = 6;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** A light tick, like the system tab bar's. */
const tick = () => {
  if (Platform.OS === 'ios') Haptics.selectionAsync().catch(() => undefined);
};

/**
 * The iOS 26 tab bar: a floating glass pill whose selected tab sits in a glass capsule that
 * slides (with a little liquid stretch) to the new tab, and that you can also drag along the
 * bar with a finger to switch.
 */
export function GlassTabBar({ items, activeIndex, onSelect }: GlassTabBarProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const itemWidth = width > 0 ? (width - PAD * 2) / items.length : 0;

  const x = useRef(new Animated.Value(0)).current;
  const stretch = useRef(new Animated.Value(1)).current;
  const lens = useRef(new Animated.Value(1)).current;
  const visible = useRef(new Animated.Value(activeIndex >= 0 ? 1 : 0)).current;

  const placed = useRef(false);
  const dragging = useRef(false);
  const dragStart = useRef(0);
  const lastHover = useRef(-1);
  const live = useRef({ itemWidth, count: items.length, activeIndex, onSelect });
  live.current = { itemWidth, count: items.length, activeIndex, onSelect };

  useEffect(() => {
    const event = Platform.OS === 'ios' ? ['keyboardWillShow', 'keyboardWillHide'] : ['keyboardDidShow', 'keyboardDidHide'];
    const show = Keyboard.addListener(event[0] as 'keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener(event[1] as 'keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    Animated.timing(visible, { toValue: activeIndex >= 0 ? 1 : 0, duration: 160, useNativeDriver: false }).start();
    if (activeIndex < 0 || itemWidth === 0 || dragging.current) return;

    const target = activeIndex * itemWidth;
    if (!placed.current) {
      x.setValue(target);
      placed.current = true;
      return;
    }

    Animated.parallel([
      Animated.spring(x, { toValue: target, damping: 17, stiffness: 200, mass: 0.9, useNativeDriver: false }),
      Animated.sequence([
        Animated.timing(stretch, { toValue: 1.14, duration: 110, useNativeDriver: false }),
        Animated.spring(stretch, { toValue: 1, damping: 9, stiffness: 190, useNativeDriver: false }),
      ]),
    ]).start();
  }, [activeIndex, itemWidth, x, stretch, visible]);

  const finishDrag = () => {
    dragging.current = false;
    Animated.spring(lens, { toValue: 1, damping: 14, stiffness: 220, useNativeDriver: false }).start();

    x.stopAnimation((value) => {
      const { itemWidth: w, count, activeIndex: current, onSelect: select } = live.current;
      const target = clamp(Math.round(value / w), 0, count - 1);
      setHover(null);

      if (target !== current) select(target);
      else Animated.spring(x, { toValue: target * w, damping: 17, stiffness: 200, useNativeDriver: false }).start();
    });
  };

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => {
        dragging.current = true;
        lastHover.current = live.current.activeIndex;
        x.stopAnimation((value) => {
          dragStart.current = value;
        });
        Animated.spring(lens, { toValue: 1.1, damping: 14, stiffness: 220, useNativeDriver: false }).start();
      },
      onPanResponderMove: (_, g) => {
        const { itemWidth: w, count } = live.current;
        const next = clamp(dragStart.current + g.dx, 0, (count - 1) * w);
        x.setValue(next);
        const over = Math.round(next / w);
        if (over !== lastHover.current) {
          lastHover.current = over;
          tick();
        }
        setHover(over);
      },
      onPanResponderRelease: finishDrag,
      onPanResponderTerminate: finishDrag,
    }),
  ).current;

  if (keyboardOpen) return null;

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  const highlighted = hover ?? activeIndex;

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.bar,
        { left: TAB_BAR_SIDE_MARGIN, right: TAB_BAR_SIDE_MARGIN, bottom: tabBarBottom(insets.bottom) },
      ]}
      {...pan.panHandlers}
    >
      <GlassTabBarBackground />

      {itemWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.capsule,
            {
              left: PAD,
              width: itemWidth,
              opacity: visible,
              backgroundColor: theme.dark ? 'rgba(255,255,255,0.16)' : 'rgba(120,120,128,0.18)',
              borderColor: theme.dark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.7)',
              transform: [{ translateX: x }, { scaleX: stretch }, { scale: lens }],
            },
          ]}
        />
      ) : null}

      <View style={styles.row}>
        {items.map((item, index) => {
          const on = index === highlighted;
          const color = on ? theme.colors.primary : theme.app.textMuted;

          return (
            <Pressable
              key={item.key}
              onPress={() => {
                if (index !== activeIndex) tick();
                onSelect(index);
              }}
              style={styles.item}
              accessibilityRole="tab"
              accessibilityState={{ selected: index === activeIndex }}
              accessibilityLabel={item.label}
            >
              <Ionicons name={on ? item.iconActive : item.icon} size={23} color={color} />
              <Text style={[styles.label, { color }]} numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', height: TAB_BAR_HEIGHT, borderRadius: TAB_BAR_HEIGHT / 2 },
  row: { flex: 1, flexDirection: 'row', paddingHorizontal: PAD },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  label: { fontFamily: fontFamily.bodyBold, fontSize: 11 },
  capsule: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    borderRadius: (TAB_BAR_HEIGHT - PAD * 2) / 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
