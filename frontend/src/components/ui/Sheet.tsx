import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontFamily, fontSize, radius, spacing } from '../../theme';
import { useAppTheme } from '../../theme/use-app-theme';

interface SheetProps {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Sheet({ visible, onDismiss, title, subtitle, children, footer }: SheetProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const progress = useRef(new Animated.Value(0)).current;
  const drag = useRef(new Animated.Value(0)).current;

  const [headerHeight, setHeaderHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);

  const onHeaderLayout = useCallback(
    (e: LayoutChangeEvent) => setHeaderHeight(e.nativeEvent.layout.height),
    [],
  );
  const onFooterLayout = useCallback(
    (e: LayoutChangeEvent) => setFooterHeight(e.nativeEvent.layout.height),
    [],
  );

  const panelMaxHeight = height * 0.9;
  const chrome = headerHeight + footerHeight + insets.bottom + spacing.lg + spacing.md;
  const scrollMaxHeight = panelMaxHeight - chrome;

  useEffect(() => {
    drag.setValue(0);
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? 260 : 180,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, progress, drag]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 8,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) drag.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        const shouldClose = gesture.dy > 120 || gesture.vy > 0.8;
        if (shouldClose) {
          onDismissRef.current();
          return;
        }
        Animated.spring(drag, { toValue: 0, useNativeDriver: true, bounciness: 2 }).start();
      },
    }),
  ).current;

  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const enterY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [height * 0.4, 0],
  });

  const isIOS = Platform.OS === 'ios';

  const surface = (
    <View
      style={[
        styles.panel,
        {
          paddingBottom: insets.bottom + spacing.lg,
          borderColor: theme.app.border,
          backgroundColor: isIOS ? 'transparent' : theme.app.surface,
        },
      ]}
    >
      <View onLayout={onHeaderLayout}>
        <View style={[styles.handle, { backgroundColor: theme.app.borderStrong }]} />

        <View style={styles.heading}>
          <Text style={[styles.title, { color: theme.app.text }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: theme.app.textMuted }]}>{subtitle}</Text>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={scrollMaxHeight > 0 ? { maxHeight: scrollMaxHeight } : undefined}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
      >
        {children}
      </ScrollView>

      {footer ? (
        <View style={styles.footer} onLayout={onFooterLayout}>
          {footer}
        </View>
      ) : null}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <Animated.View style={[styles.backdrop, { opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityLabel="Fechar" />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={isIOS ? 'padding' : 'height'}
        style={styles.container}
        pointerEvents="box-none"
      >
        <Animated.View
          {...pan.panHandlers}
          style={{ transform: [{ translateY: Animated.add(enterY, drag) }] }}
        >
          {isIOS ? (
            <BlurView
              intensity={70}
              tint={theme.dark ? 'dark' : 'light'}
              style={styles.blurClip}
            >
              {surface}
            </BlurView>
          ) : (
            surface
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(10,9,8,0.45)' },
  container: { flex: 1, justifyContent: 'flex-end' },
  blurClip: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
  },
  panel: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    marginBottom: spacing.lg,
  },
  heading: { gap: spacing.xs, marginBottom: spacing.lg },
  title: { fontFamily: fontFamily.display, fontSize: fontSize.xl },
  subtitle: { fontFamily: fontFamily.body, fontSize: fontSize.sm, lineHeight: 20 },
  body: { gap: spacing.lg, paddingBottom: spacing.md },
  footer: { flexDirection: 'row', gap: spacing.md, paddingTop: spacing.lg },
});
