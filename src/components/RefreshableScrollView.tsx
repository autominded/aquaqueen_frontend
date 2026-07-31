import React, { forwardRef, useRef, useState } from "react";
import { ActivityIndicator, NativeScrollEvent, NativeSyntheticEvent, Platform, RefreshControl, ScrollView, ScrollViewProps, StyleSheet, View } from "react-native";
import { colors } from "../theme";

interface Props extends ScrollViewProps {
  refreshing: boolean;
  onRefresh: () => void;
}

const PULL_THRESHOLD = 64;
const MAX_PULL = 90;
// Below this, a touchmove is finger jitter during an ordinary tap, not a
// pull gesture — skipping the state update entirely (not just clamping to
// 0) avoids a re-render on every jittery pixel, which was making any
// button sitting at the very top of the screen (scrollTop always 0, so
// pull-tracking engages on every tap) feel unresponsive.
const PULL_DEADZONE = 6;

// RefreshControl is a real native gesture on iOS/Android, but react-native-web
// renders it as an inert View (onRefresh/refreshing are dropped entirely) —
// and the browser's own pull-to-reload gesture never engages either, since
// Expo web's app shell is a fixed-height flex container with no real
// document scroll. So on web this implements the pull gesture by hand from
// raw touch/scroll events instead of delegating to RefreshControl.
export const RefreshableScrollView = forwardRef<ScrollView, Props>(function RefreshableScrollView(
  { refreshing, onRefresh, children, style, contentContainerStyle, onScroll, onTouchStart, onTouchMove, onTouchEnd, ...rest },
  ref
) {
  if (Platform.OS !== "web") {
    return (
      <ScrollView
        ref={ref}
        style={style}
        contentContainerStyle={contentContainerStyle}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        {...rest}
      >
        {children}
      </ScrollView>
    );
  }

  const scrollTopRef = useRef(0);
  const startYRef = useRef<number | null>(null);
  const triggeredRef = useRef(false);
  const [pullDistance, setPullDistance] = useState(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    // On web, nativeEvent is the raw DOM scroll Event — no contentOffset,
    // so read the scrollable div's own scrollTop off its target instead.
    scrollTopRef.current = (e.nativeEvent as unknown as { target: { scrollTop: number } }).target?.scrollTop ?? 0;
    onScroll?.(e);
  };

  const handleTouchStart = (e: any) => {
    startYRef.current = scrollTopRef.current <= 0 ? e.nativeEvent.touches[0].pageY : null;
    triggeredRef.current = false;
    onTouchStart?.(e);
  };

  const handleTouchMove = (e: any) => {
    if (startYRef.current == null || refreshing) return;
    const deltaY = e.nativeEvent.touches[0].pageY - startYRef.current;
    if (deltaY > PULL_DEADZONE) setPullDistance(Math.min((deltaY - PULL_DEADZONE) * 0.5, MAX_PULL));
    onTouchMove?.(e);
  };

  const handleTouchEnd = (e: any) => {
    if (startYRef.current != null && pullDistance >= PULL_THRESHOLD && !triggeredRef.current) {
      triggeredRef.current = true;
      onRefresh();
    }
    startYRef.current = null;
    setPullDistance(0);
    onTouchEnd?.(e);
  };

  const indicatorHeight = refreshing ? PULL_THRESHOLD : pullDistance;

  return (
    <View style={styles.wrapper}>
      {indicatorHeight > 0 && (
        <View style={[styles.indicator, { height: indicatorHeight }]}>
          <ActivityIndicator color={colors.teal} />
        </View>
      )}
      <ScrollView
        ref={ref}
        style={style}
        contentContainerStyle={contentContainerStyle}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        {...rest}
      >
        {children}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  indicator: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
});
