import React, { useEffect } from "react";
import { Pressable } from "react-native";
import { createBottomTabNavigator, BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { CommonActions, NavigationProp, useIsFocused } from "@react-navigation/native";
import { AppTabParamList } from "./types";
import { DashboardScreen } from "../screens/DashboardScreen";
import { AppIcon } from "../components/AppIcon";
import { useAdvisoryPoll } from "../lib/useAdvisoryPoll";
import { colors } from "../theme";
import { makeLazyStack } from "./lazyStack";

// Each tab's stack is its own async chunk (see index.ts for the
// '@expo/metro-runtime' import that makes `expo export --platform web`
// actually split on these) — Dashboard alone doesn't need Batches',
// Sales', Purchases', or Profile's code (which pulls in Hatchery, Admin,
// Marketplace...), so there's no reason for a Dashboard-only visit to pay
// for downloading all of it up front. See lazyStack.tsx for why this uses
// makeLazyStack rather than React.lazy().
const batchesChunk = makeLazyStack(() => import("./BatchesStack").then((m) => m.BatchesStack));
const salesChunk = makeLazyStack(() => import("./SalesStack").then((m) => m.SalesStack));
const purchasesChunk = makeLazyStack(() => import("./PurchasesStack").then((m) => m.PurchasesStack));
const profileChunk = makeLazyStack(() => import("./ProfileStack").then((m) => m.ProfileStack));

const TAB_CHUNKS: Partial<Record<keyof AppTabParamList, ReturnType<typeof makeLazyStack>>> = {
  Batches: batchesChunk,
  Sales: salesChunk,
  Purchases: purchasesChunk,
  Profile: profileChunk,
};

const Tab = createBottomTabNavigator<AppTabParamList>();

const TAB_ICONS: Record<keyof AppTabParamList, React.ComponentProps<typeof AppIcon>["name"]> = {
  Dashboard: "home",
  Batches: "layers",
  Sales: "shopping-bag",
  Purchases: "credit-card",
  Profile: "user",
};

// The first screen registered in each tab's own stack navigator — see
// BatchesStack/SalesStack/PurchasesStack/ProfileStack.
const TAB_ROOT_SCREEN: Partial<Record<keyof AppTabParamList, string>> = {
  Batches: "OperationsHome",
  Sales: "POS",
  Purchases: "PurchasesHome",
  Profile: "Profile",
};

// Bottom-tabs keeps each tab's nested stack exactly where you left it by
// default (e.g. still on Team after leaving More for another tab and coming
// back) — `resetOnBlur` below makes each tab's stack reset to its root
// screen instead, so switching tabs always lands you on the tab's default
// view, not wherever you drilled into last time.
//
// Three distinct bugs had to be found and fixed (via `onStateChange`
// debug-logging every navigation commit, plus wrapping `window.history`) to
// get this transition to render as a single clean commit on web:
//
// 1. Several earlier versions tried to reset the nested stack via a manual
//    `navigation.dispatch(...)` — either combined with the tab-focus switch
//    in one hand-built action, or fired separately on the tab's own `blur`
//    event. Every shape still showed a second, redundant `history` write:
//    ANY `dispatch()` anywhere in the tree — even one explicitly
//    `target`-ed at an unfocused, invisible nested stack — changes the root
//    navigation state's object identity, which re-fires
//    NavigationContainer's linking→history sync as its own separate
//    commit, even when the recomputed path string is identical to what's
//    already in the address bar. `resetOnBlur` avoids this by resetting
//    state a completely different way: destroying and remounting the tab's
//    stack component tree via React's own unmount/mount lifecycle (this
//    installed react-navigation version has no built-in `unmountOnBlur`
//    for bottom-tabs screens, so it's done by hand with `useIsFocused` +
//    conditional rendering) instead of any dispatch. A freshly-mounted
//    stack navigator always starts at its root Stack.Screen with no
//    dispatch involved, so there's nothing for the linking sync to react
//    to a second time.
//
// 2. Separately — and this turned out to be the actual cause of the
//    severe, very-visible flicker — `makeTabBarButton` below wraps
//    bottom-tabs' own tabBarButton in a bare `Pressable`. Bottom-tabs
//    passes that button an `href` (so tab buttons render as real
//    `<a href>` anchors on web, for right-click/open-in-new-tab support).
//    The default button implementation calls `preventDefault()` before
//    handling the press itself; a bare `Pressable` does not do that for
//    you, so an un-prevented click let the BROWSER also follow the anchor
//    natively — a genuine full-page reload racing the SPA navigation this
//    handler triggers. See the `preventDefault()` call below.
//
// 3. A third variant reappeared once the tab stacks became async chunks:
//    pressing a tab commits the focus change (and its URL) immediately,
//    but if that tab's chunk hasn't resolved yet, there's no nested state
//    to derive a full path from — the URL briefly shows the bare tab path
//    (`/Sales`), then corrects itself once the stack actually mounts. The
//    first fix attempt — `await import(...)` in the press handler before
//    triggering navigation — did NOT work, and the reason is instructive:
//    with React.lazy(ctor), `ctor().then(onFulfill)` always defers
//    `onFulfill` to a microtask, even when the promise ctor() returns was
//    ALREADY resolved by that earlier await. So lazy()'s internal render
//    still suspends once on every component instance's first-ever render,
//    no matter how thoroughly the underlying import was pre-warmed. Since
//    that suspend happens on a DIFFERENT render than the one that commits
//    the tab-focus change, the two race exactly like case 1 above.
//    `makeLazyStack` above sidesteps this by keeping its own
//    module-scope-cached component reference, checked synchronously (no
//    `.then()` on the hot path) — combined with awaiting `ensureLoaded()`
//    in the press handler below, the cache is guaranteed populated before
//    `<LazyStack>` ever renders, so its first render reads the already-set
//    `cached` value directly and never shows a fallback for that commit.
function resetOnBlur<P extends object>(chunk: ReturnType<typeof makeLazyStack<P>>) {
  return function ResetOnBlur(props: P) {
    const isFocused = useIsFocused();
    if (!isFocused) return null;
    return <chunk.LazyStack {...props} />;
  };
}

function isTabAlreadyFocused(navigation: NavigationProp<AppTabParamList>, routeName: keyof AppTabParamList) {
  const state = navigation.getState();
  return state.routes[state.index]?.name === routeName;
}

// Defined once at module scope, not inline in AppTabs' render — an inline
// `resetOnBlur(batchesChunk)` would create a brand new component type on
// every AppTabs re-render, forcing React to unmount/remount every tab's
// stack constantly, not just on genuine focus changes.
const BatchesStackWithReset = resetOnBlur(batchesChunk);
const SalesStackWithReset = resetOnBlur(salesChunk);
const PurchasesStackWithReset = resetOnBlur(purchasesChunk);
const ProfileStackWithReset = resetOnBlur(profileChunk);

// tabPress never fires on web for the tab that's already focused (e.g.
// you're on Sale, tapped "Add product", and tap the Sale icon again hoping
// to bail out) — `unmountOnBlur` can't cover this case either, since focus
// never actually leaves the tab. tabBarButton's raw onPress fires on every
// physical press regardless of focus state, so it's used only to handle
// this one already-focused case; every other press (including the normal
// tab-to-tab switch) is left completely untouched, using the default
// button behavior. It also awaits the target tab's chunk (case 3 above)
// before letting the navigation actually commit.
function makeTabBarButton(routeName: keyof AppTabParamList, navigation: NavigationProp<AppTabParamList>) {
  const rootScreen = TAB_ROOT_SCREEN[routeName];
  if (!rootScreen) return undefined;
  const chunk = TAB_CHUNKS[routeName];
  return (props: BottomTabBarButtonProps) => (
    <Pressable
      {...(props as any)}
      onPress={async (e: any) => {
        // `props.href` (bottom-tabs passes one so tab buttons render as real
        // `<a href>` anchors on web, for right-click/open-in-new-tab
        // support) means an unprevented click lets the BROWSER follow that
        // link natively — a full page reload — racing the SPA navigation
        // this handler triggers below. The default tabBarButton calls
        // preventDefault() internally before delegating; wrapping it in a
        // bare Pressable here bypasses that, so it has to be done by hand.
        e?.preventDefault?.();
        if (chunk) await chunk.ensureLoaded();
        if (isTabAlreadyFocused(navigation, routeName)) {
          const state = navigation.getState();
          const nestedState = state.routes[state.index]?.state as
            | { key: string; index: number; routes: { name: string }[] }
            | undefined;
          if (nestedState && nestedState.index !== 0) {
            const rootRoute = nestedState.routes[0]?.name === rootScreen ? nestedState.routes[0] : { name: rootScreen };
            navigation.dispatch({ ...CommonActions.reset({ index: 0, routes: [rootRoute] }), target: nestedState.key });
          }
        }
        props.onPress?.(e);
      }}
    />
  );
}

// A tab's chunk is only fetched once something actually asks for it — with
// nothing warming the cache first, the first visit to each tab would need
// its own await inside the press handler above, adding a perceptible pause
// before that tab responds. This prefetches all four in the background
// once the Dashboard is already up, so by the time a real tap happens
// `ensureLoaded()` resolves immediately. Deliberately delayed (not fired
// the instant AppTabs mounts) so it never competes with Dashboard's own
// first paint or data fetches for bandwidth/main-thread time.
function usePrefetchTabChunks() {
  useEffect(() => {
    const idle =
      typeof requestIdleCallback === "function" ? requestIdleCallback : (cb: () => void) => setTimeout(cb, 2000);
    const cancel = typeof cancelIdleCallback === "function" ? cancelIdleCallback : clearTimeout;
    const handle = idle(() => {
      Object.values(TAB_CHUNKS).forEach((chunk) => chunk?.ensureLoaded());
    });
    return () => cancel(handle as never);
  }, []);
}

export function AppTabs() {
  const advisoryCount = useAdvisoryPoll();
  usePrefetchTabChunks();

  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        headerTintColor: colors.ocean,
        headerTitleStyle: { fontWeight: "800" },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.canvas },
        tabBarActiveTintColor: colors.teal,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        tabBarStyle: { height: 68, paddingTop: 6, backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarIcon: ({ color, focused }) => <AppIcon name={TAB_ICONS[route.name]} size={focused ? 22 : 21} color={color} />,
        tabBarButton: makeTabBarButton(route.name, navigation),
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          headerShown: false,
          tabBarLabel: "Home",
          tabBarBadge: advisoryCount > 0 ? advisoryCount : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.coral },
        }}
      />
      <Tab.Screen name="Batches" component={BatchesStackWithReset} options={{ headerShown: false, tabBarLabel: "Operations" }} />
      <Tab.Screen name="Sales" component={SalesStackWithReset} options={{ headerShown: false, tabBarLabel: "Sale" }} />
      <Tab.Screen name="Purchases" component={PurchasesStackWithReset} options={{ headerShown: false, tabBarLabel: "Finance" }} />
      <Tab.Screen name="Profile" component={ProfileStackWithReset} options={{ headerShown: false, tabBarLabel: "More" }} />
    </Tab.Navigator>
  );
}
