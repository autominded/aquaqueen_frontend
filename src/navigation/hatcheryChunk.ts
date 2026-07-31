import { makeLazyStack } from "./lazyStack";

// Its own file (not co-located in ProfileStack.tsx) so both ProfileStack
// (which renders it) and ProfileScreen (whose menu item navigates to it,
// and needs to await `ensureLoaded()` first — see lazyStack.tsx) can import
// it without a circular dependency between the two.
export const hatcheryChunk = makeLazyStack(() => import("./HatcheryStack").then((m) => m.HatcheryStack));
