// lib/avatar.ts — shared profile-picture state.
//
// The sidebar renders from the Better Auth session, which carries no `image`.
// The profile page publishes the fresh URL here after upload; the sidebar
// subscribes via useSyncExternalStore so it re-renders without a refetch.

const listeners = new Set<() => void>();

let current: string | null | undefined;

export function readAvatar(): string | null | undefined {
  return current;
}

export function setAvatar(url: string | null | undefined): void {
  current = url;
  listeners.forEach((listener) => listener());
}

export function subscribeAvatar(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
