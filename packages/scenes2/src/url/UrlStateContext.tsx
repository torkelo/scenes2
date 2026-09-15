import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { UrlKeyManager } from './UrlKeyMapper';

/**
 * The value of each url key a consumer claimed, under the name it asked for
 * rather than the one it was given.
 *
 * Reading, a key the query string has no value for is left out. Writing, a key
 * left out is untouched and a key set to `undefined` is removed.
 */
export type UrlValues<T> = { readonly [K in keyof T]?: string | undefined };

/**
 * The query string of one subtree, and the way to change it.
 *
 * The query string is behind {@link UrlStateContextValue.getParams} rather than on the
 * context itself, because a value on the context would re-render every consumer
 * below the provider on every location change. Read it through
 * {@link UrlStateContextValue.subscribe} instead, and a consumer only renders again when the
 * keys it cares about move.
 */
export interface UrlStateContextValue {
  /** Hands out the url keys, so that two consumers never share one. */
  readonly registry: UrlKeyManager;
  /** The query string as it stands. */
  getParams(): URLSearchParams;
  /**
   * Calls `listener` after every change to the query string, and hands back the
   * way to stop.
   */
  subscribe(listener: () => void): () => void;
  /** Writes url keys, under the names the query string carries. */
  write(values: Record<string, string | undefined>): void;
}

/**
 * The query string that consumers below sync through. It is undefined by
 * default: without a {@link UrlStateProvider} above them, consumers keep their
 * state to themselves and leave the URL alone.
 */
export const UrlStateContext = createContext<UrlStateContextValue | undefined>(
  undefined,
);

export interface UrlStateProviderProps {
  /**
   * Registry to share with the subtree. Omit to create one for this provider.
   */
  registry?: UrlKeyManager;
  children: React.ReactNode;
}

/**
 * Syncs the state of the consumers below to the query string.
 *
 * Mount one near the root of the app, inside the router: the location is both
 * where this reads the state from and what it subscribes to, so a consumer
 * picks up a change to its keys however it was made — the back button, a
 * `Link`, or another consumer.
 *
 * Nested consumers that want the same url key take a numbered one instead —
 * see {@link UrlKeyManager}.
 */
export function UrlStateProvider({
  registry,
  children,
}: UrlStateProviderProps) {
  const [ownRegistry] = useState(() => new UrlKeyManager());
  const location = useLocation();
  const navigate = useNavigate();

  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  // What `value` below reads each time it is called. Going through a ref lets
  // the context value stay one object for the life of the provider, and that is
  // what keeps a location change from re-rendering every consumer below,
  // whether or not it touched their keys.
  //
  // These params are also the query string a write starts from.
  // `location.search` still holds the old one until the router re-renders, so a
  // second write in the same tick would navigate away from what the first one
  // wrote. Writes leave the ref holding what they navigated to, so they stack.
  // Nothing renders between two writes in a tick, which is what makes it safe
  // to put the committed query string back here on every render.
  const current = {
    registry: registry ?? ownRegistry,
    params,
    navigate,
    hash: location.hash,
  };

  const latest = useRef(current);

  //eslint-disable-next-line react-hooks/refs
  latest.current = current;

  const [listeners] = useState(() => new Set<() => void>());

  const [value] = useState<UrlStateContextValue>(() => ({
    get registry() {
      return latest.current.registry;
    },
    getParams: () => latest.current.params,
    subscribe: (listener) => subscribeTo(listeners, listener),
    write: (values) => {
      const { params: from, hash, navigate: go } = latest.current;
      const next = applyValues(from, values);

      if (next === from) {
        return;
      }

      latest.current.params = next;
      go({ search: next.toString(), hash });
    },
  }));

  // In a layout effect rather than a plain one so that a consumer whose keys
  // moved renders in the same commit the router made, instead of painting the
  // values it has just moved off and correcting them a frame later.
  useLayoutEffect(() => {
    notify(listeners);
  }, [listeners, params]);

  return (
    <UrlStateContext.Provider value={value}>
      {children}
    </UrlStateContext.Provider>
  );
}

/**
 * Claims a url key for every entry in `keys` for as long as the component stays
 * mounted, and hands back what the query string holds for them along with the
 * way to write them.
 *
 * The values are the ones the component mounted on, and then the new ones after
 * every change to them, whoever made it — the back button, a `Link`, or another
 * component. Only the keys the query string has a value for are there, so that
 * the component's own defaults fill in the rest.
 *
 * `T` names the url state, and `keys` has to cover it. Naming a shape of its own
 * is worth it for state that other code reads; otherwise leave `T` off and it is
 * inferred from `keys`. Either way, the values and the writer only carry the
 * keys that were claimed.
 *
 * ```tsx
 * const [url, setUrl] = useUrlState<{ from: string; to: string }>(['from', 'to']);
 *
 * setUrl({ from: 'now-1h', to: 'now' });
 * ```
 *
 * A location change that leaves the claimed keys alone hands the same values
 * object back and does not render the component again, so a page full of
 * consumers only wakes the ones a change reaches. Writing a key the query string
 * already holds the value for is the same story: nothing to render, and no
 * history entry either.
 *
 * Without a {@link UrlStateProvider} above, the values live in a query string of
 * this component's own and never reach the URL. Everything else works the same,
 * so a consumer never has to branch on whether url syncing is turned on.
 *
 * The keys are read once, on mount; changing them later has no effect. Which
 * url key a claim resolves to depends on what is already claimed, so a
 * component has to go through the returned writer instead of touching the query
 * string itself.
 */
export function useUrlState<T extends object>(
  keys: readonly (keyof T & string)[],
): [UrlValues<T>, (update: T) => void] {
  const { registry, getParams, subscribe, write } = useUrlStateStore();
  const owner = useId();
  const [claimedKeys] = useState(() => [...keys]);

  // Claimed while rendering so that state initializers, which run before any
  // effect, can already read their values out of the URL. Claiming is keyed by
  // owner and idempotent, so a repeated render reuses the same keys. A render
  // React throws away and never retries holds on to them, which is the price
  // of having them this early.
  const claimed = registry.claim(owner, claimedKeys) as Readonly<
    Record<keyof T & string, string>
  >;

  useEffect(() => {
    // Strict mode runs the cleanup below between two mounts, so claim again to
    // take back the keys the first mount released. Effects run child before
    // parent, the reverse of the render order that handed the keys out, so the
    // keys from that first claim have to be asked for by name.
    registry.claim(owner, claimedKeys, claimed);

    return () => registry.release(owner);
  }, [registry, owner, claimedKeys, claimed]);

  // The values handed over last, which come back unchanged for as long as the
  // query string still holds them. A location change that leaves the claimed
  // keys alone gives the same object back, so React has nothing to re-render,
  // and neither does anything below that took the values into a dependency
  // array.
  const snapshot = useRef<Record<string, string> | undefined>(undefined);

  const getSnapshot = useCallback(() => {
    const values = readValues(getParams(), claimed);
    const previous = snapshot.current;

    if (previous && sameValues(previous, values)) {
      return previous;
    }

    snapshot.current = values;

    return values;
  }, [getParams, claimed]);

  const state = useSyncExternalStore(subscribe, getSnapshot) as UrlValues<T>;

  const set = useCallback(
    (update: UrlValues<T>) => {
      const named: Record<string, string | undefined> = update;
      const mapped: Record<string, string | undefined> = {};

      for (const [key, value] of Object.entries(named)) {
        mapped[urlKeyOf(claimed, key)] = value;
      }

      write(mapped);
    },
    [claimed, write],
  );

  return [state, set];
}

/**
 * The url state a consumer syncs through: the one from the closest
 * {@link UrlStateProvider} above it, or one of its own when there is none.
 *
 * Both come out of one state initializer rather than a hook each, so a consumer
 * under a provider never creates a local state, and one without a provider
 * creates it once, on its first render. Calling one hook or the other instead
 * would change the hook order of a consumer whose provider arrives later.
 */
function useUrlStateStore(): UrlStateContextValue {
  const context = useContext(UrlStateContext);

  if (context) {
    return context;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useMemo(() => createLocalUrlState(), []);
}

/**
 * A query string of its own, which only the consumer that made it can see. The
 * values never reach the URL, and neither does the registry, so its keys never
 * collide with anyone's.
 */
function createLocalUrlState(): UrlStateContextValue {
  const registry = new UrlKeyManager();
  const listeners = new Set<() => void>();
  let params = new URLSearchParams();

  return {
    registry,
    getParams: () => params,
    subscribe: (listener) => subscribeTo(listeners, listener),
    write: (values) => {
      const next = applyValues(params, values);

      if (next === params) {
        return;
      }

      params = next;
      notify(listeners);
    },
  };
}

/** Adds `listener`, and hands back the way to take it off again. */
function subscribeTo(listeners: Set<() => void>, listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/** Copied first, so that a listener is free to unsubscribe as it runs. */
function notify(listeners: ReadonlySet<() => void>): void {
  for (const listener of [...listeners]) {
    listener();
  }
}

/** Reads the claimed url keys out of `params`, under the claimed names. */
function readValues(
  params: URLSearchParams,
  claimed: Readonly<Record<string, string>>,
): Record<string, string> {
  const values: Record<string, string> = {};

  for (const [key, urlKey] of Object.entries(claimed)) {
    const value = params.get(urlKey);

    if (value !== null) {
      values[key] = value;
    }
  }

  return values;
}

/**
 * Returns `params` with `values` applied, or `params` itself when it already
 * holds them. A value of `undefined` removes its key.
 */
function applyValues(
  params: URLSearchParams,
  values: Record<string, string | undefined>,
): URLSearchParams {
  const next = new URLSearchParams(params);
  let changed = false;

  for (const [urlKey, value] of Object.entries(values)) {
    if (value === undefined) {
      if (next.has(urlKey)) {
        next.delete(urlKey);
        changed = true;
      }
    } else if (next.get(urlKey) !== value) {
      next.set(urlKey, value);
      changed = true;
    }
  }

  return changed ? next : params;
}

/** Whether `a` and `b` hold the same keys with the same values. */
function sameValues(
  a: Readonly<Record<string, unknown>>,
  b: Readonly<Record<string, unknown>>,
): boolean {
  const keys = Object.keys(a);

  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => a[key] === b[key])
  );
}

function urlKeyOf(claimed: Readonly<Record<string, string>>, key: string) {
  const urlKey = claimed[key];

  if (!urlKey) {
    throw new Error(`Url key "${key}" was not claimed by useUrlState`);
  }

  return urlKey;
}
