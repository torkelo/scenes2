import { createContext, useContext, useEffect, useId, useMemo } from 'react';
import React from 'react';

import { UrlStateRegistry } from './UrlStateRegistry';

/**
 * The registry that state providers below sync through. It is undefined by
 * default: without a {@link UrlStateProvider} above them, providers keep their
 * state to themselves and leave the URL alone.
 */
export const UrlStateContext = createContext<UrlStateRegistry | undefined>(
  undefined,
);

export interface UrlStateProviderProps {
  /**
   * Registry to share with the subtree. Omit to create one for this provider.
   */
  registry?: UrlStateRegistry;
  children: React.ReactNode;
}

/**
 * Syncs the state of the providers below to the query string.
 *
 * Mount one near the root of the app. Nested providers that want the same url
 * key take a numbered one instead — see {@link UrlStateRegistry}.
 */
export function UrlStateProvider({
  registry,
  children,
}: UrlStateProviderProps) {
  const [ownRegistry] = React.useState(() => new UrlStateRegistry());

  return (
    <UrlStateContext.Provider value={registry ?? ownRegistry}>
      {children}
    </UrlStateContext.Provider>
  );
}

/** Returns the closest registry, or undefined when there is no provider. */
export function useUrlState(): UrlStateRegistry | undefined {
  return useContext(UrlStateContext);
}

/**
 * Reads and writes the url keys claimed by {@link useUrlSync}, under the names
 * the consumer asked for rather than the ones it was given.
 */
export interface UrlStateSync {
  /** The url key each claimed key resolved to, e.g. `{ from: 'from2' }`. */
  readonly keys: Readonly<Record<string, string>>;
  /** Returns the value the URL holds for `key`, or undefined when it has none. */
  get(key: string): string | undefined;
  /**
   * Writes `values` to the query string, replacing the current history entry.
   * A value of `undefined` removes its key.
   */
  set(values: Record<string, string | undefined>): void;
}

/**
 * Claims `keys` in the closest registry for as long as the component stays
 * mounted, and returns the reader and writer for them. Returns undefined when
 * no {@link UrlStateProvider} is mounted above, which is the signal to skip
 * url syncing.
 *
 * The keys are read once, on mount; changing them later has no effect. Which
 * key a claim resolves to depends on what is already claimed, so a component
 * has to go through the returned {@link UrlStateSync} instead of touching the
 * query string itself.
 */
export function useUrlSync(keys: readonly string[]): UrlStateSync | undefined {
  const registry = useUrlState();
  const owner = useId();
  const [claimedKeys] = React.useState(() => [...keys]);

  // Claimed while rendering so that state initializers, which run before any
  // effect, can already read their values out of the URL. Claiming is keyed by
  // owner and idempotent, so a repeated render reuses the same keys. A render
  // React throws away and never retries holds on to them, which is the price
  // of having them this early.
  const claimed = registry?.claim(owner, claimedKeys);

  useEffect(() => {
    if (!registry) {
      return;
    }

    // Strict mode runs the cleanup below between two mounts, so claim again to
    // take back the keys the first mount released. Effects run child before
    // parent, the reverse of the render order that handed the keys out, so the
    // keys from that first claim have to be asked for by name.
    registry.claim(owner, claimedKeys, claimed);

    return () => registry.release(owner);
  }, [registry, owner, claimedKeys, claimed]);

  return useMemo(() => {
    if (!registry || !claimed) {
      return undefined;
    }

    return {
      keys: claimed,
      get: (key: string) => registry.read(urlKeyOf(claimed, key)),
      set: (values: Record<string, string | undefined>) => {
        const mapped: Record<string, string | undefined> = {};

        for (const [key, value] of Object.entries(values)) {
          mapped[urlKeyOf(claimed, key)] = value;
        }

        registry.write(mapped);
      },
    };
  }, [registry, claimed]);
}

function urlKeyOf(claimed: Readonly<Record<string, string>>, key: string) {
  const urlKey = claimed[key];

  if (!urlKey) {
    throw new Error(`Url key "${key}" was not claimed by useUrlSync`);
  }

  return urlKey;
}
