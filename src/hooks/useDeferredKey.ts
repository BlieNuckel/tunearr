import { useState } from "react";

/**
 * `key` once `ready` has been true for it, null before. It stays on after that,
 * so a later refetch elsewhere on the page doesn't stop work that has started.
 * A new key starts out waiting again.
 */
export default function useDeferredKey(
  key: string | null | undefined,
  ready: boolean
): string | null {
  const [startedFor, setStartedFor] = useState<string | null>(null);

  if (ready && key && startedFor !== key) {
    setStartedFor(key);
  }

  return key && (startedFor === key || ready) ? key : null;
}
