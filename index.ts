// Enables Metro's automatic web bundle splitting (async imports become
// separate chunks in production) — not on by default outside Expo Router,
// so it has to be imported explicitly here. See React.lazy() usage in
// RootNavigator.tsx / AppTabs.tsx, which is what actually produces the
// async imports for it to split on.
import '@expo/metro-runtime';

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
