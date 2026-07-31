import React, { useEffect, useState } from "react";
import { LoadingView } from "../components/LoadingView";

// Deliberately not React.lazy() — its internal `.then()` always defers to a
// microtask even when the underlying promise is already resolved, which is
// exactly the gap that caused a URL-flicker bug on web: React Navigation
// commits a tab/screen focus change (and its URL) synchronously, but if the
// lazily-loaded content one render later still has to wait one more
// microtask to resolve, the two race — the URL briefly reflects the
// not-yet-mounted destination before correcting itself. `makeLazyStack`
// caches the resolved component in a plain module-scope variable, checked
// synchronously on render (no `.then()` on the hot path) — pair with
// `ensureLoaded()` awaited BEFORE the navigation that reveals this
// component, and its first render finds the cache already populated.
export function makeLazyStack<P extends object>(load: () => Promise<React.ComponentType<P>>) {
  let cached: React.ComponentType<P> | null = null;
  let pending: Promise<React.ComponentType<P>> | null = null;

  function ensureLoaded(): Promise<React.ComponentType<P>> {
    if (cached) return Promise.resolve(cached);
    if (!pending) pending = load().then((C) => (cached = C));
    return pending;
  }

  function LazyStack(props: P) {
    // Same footgun as the setComponent call below, in the other direction:
    // useState's initial-value argument ALSO treats a function as a lazy
    // initializer to be called, not a literal — passing `cached` directly
    // would call it (running the component as a plain function with no
    // props) the moment the cache is already warm on first render, which is
    // exactly the path the pre-await fix in makeTabBarButton /
    // navigateToMenuItem relies on. `() => cached` makes the lazy
    // initializer return `cached` instead of being `cached` itself.
    const [Component, setComponent] = useState<React.ComponentType<P> | null>(() => cached);
    useEffect(() => {
      // `setComponent(C)` directly would be wrong: useState's setter treats
      // a function argument as an updater `(prev) => next`, not a literal
      // value — since C IS a function (the component itself), React would
      // call it as Component(prevState) and store its return value (a JSX
      // element, i.e. a plain object) as state instead of the component
      // reference. Wrapping in `() => C` forces it to be treated as a
      // literal. (Surfaces as "Element type is invalid ... got: object" —
      // easy to misread as a chunk-loading problem when it's actually this.)
      if (!Component) ensureLoaded().then((C) => setComponent(() => C));
    }, [Component]);
    if (!Component) return <LoadingView />;
    return <Component {...props} />;
  }

  return { LazyStack, ensureLoaded };
}
