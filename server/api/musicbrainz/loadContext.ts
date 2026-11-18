import { AsyncLocalStorage } from "node:async_hooks";

/**
 * What happened during one cached load. A loader can make several MusicBrainz
 * calls, and only the calls themselves know whether they failed or found
 * nothing, so they report here instead of through the loader's return value.
 */
export type LoadContext = {
  /** A call failed or was answered from a kept value; the result may be incomplete. */
  failed: boolean;
  /** A call came back 400/404: the entity doesn't exist (yet). */
  notFound: boolean;
};

const storage = new AsyncLocalStorage<LoadContext>();

export function newLoadContext(): LoadContext {
  return { failed: false, notFound: false };
}

export function runInLoadContext<T>(context: LoadContext, fn: () => T): T {
  return storage.run(context, fn);
}

/** The load the current call is part of, if any. */
export function currentLoadContext(): LoadContext | undefined {
  return storage.getStore();
}

export function markLoadFailed(context = storage.getStore()): void {
  if (context) context.failed = true;
}

export function markLoadNotFound(): void {
  const context = storage.getStore();
  if (context) context.notFound = true;
}
