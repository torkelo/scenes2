import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { UrlStateRegistry } from './UrlStateRegistry';

/**
 * The value of each url key a consumer claimed, under the name it asked for
 * rather than the one it was given.
 *
 * Reading, a key the query string has no value for is left out. Writing, a key
 * left out is untouched and a key set to `undefined` is removed.
 */
export type UrlValues<T> = { readonly [K in keyof T]?: string | undefined };

/** Writes the url keys claimed by {@link useUrlSync}. */
export interface UrlSync<T> {
  /** The url key each claimed key resolved to, e.g. `{ from: 'from2' }`. */
  readonly keys: Readonly<Record<keyof T & string, string>>;
  /**
   * Writes `values` to the query string, adding a history entry so that the
   * back button returns to the state before it. Writing what the query string
   * already holds does nothing.
   */
  set(values: UrlValues<T>): void;
}

/** The query string of one subtree, and the way to change it. */
export interface UrlState {
  /** Hands out the url keys, so that two consumers never share one. */
  readonly registry: UrlStateRegistry;
  /** The query string as it stands, replaced on every location change. */
  readonly params: URLSearchParams;
  /** Writes url keys, under the names the query string carries. */
  write(values: Record<string, string | undefined>): void;
}

/**
 * The query string that consumers below sync through. It is undefined by
 * default: without a {@link UrlStateProvider} above them, consumers keep their
 * state in React state and leave the URL alone.
 */
export const UrlStateContext = createContext<UrlState | undefined>(undefined);

export interface UrlStateProviderProps {
  /**
   * Registry to share with the subtree. Omit to create one for this provider.
   */
  registry?: UrlStateRegistry;
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
 * see {@link UrlStateRegistry}.
 */
export function UrlStateProvider({
  registry,
  children,
}: UrlStateProviderProps) {
  const [ownRegistry] = useState(() => new UrlStateRegistry());
  const location = useLocation();
  const navigate = useNavigate();

  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  // The query string a write starts from. `location.search` still holds the old
  // one until the router re-renders, so a second write in the same tick would
  // navigate away from what the first one wrote. Writes go through this ref
  // instead and leave it holding what they navigated to, so they stack. Nothing
  // renders between two writes in a tick, which is what makes it safe to put
  // the committed query string back here on every render.
  const pending = useRef(params);
  pending.current = params;

  const value = useMemo(
    () => ({
      registry: registry ?? ownRegistry,
      params,
      write: (values: Record<string, string | undefined>) => {
        const next = applyValues(pending.current, values);

        if (next === pending.current) {
          return;
        }

        pending.current = next;

        navigate({ search: next.toString(), hash: location.hash });
      },
    }),
    [registry, ownRegistry, params, location.hash, navigate],
  );

  return (
    <UrlStateContext.Provider value={value}>
      {children}
    </UrlStateContext.Provider>
  );
}

/**
 * Claims a url key for every entry in `keys` for as long as the component stays
 * mounted, and keeps `onChange` fed with what the query string holds for them.
 *
 * `onChange` runs on the first render with the values the component mounted on,
 * and again on every later change to them, whoever made it — the back button, a
 * `Link`, or another component. Its job is to fold those values into the
 * component's own state, which it does with a `setState` call: it runs while
 * rendering, so that the state is already right on the first paint and in the
 * effects of the children below, and anything other than a `setState` belongs
 * in an effect instead. Fold in only the keys the values carry, since the ones
 * the query string has no value for are left out for the component's own
 * defaults to fill in.
 *
 * `T` names the url state, and `keys` has to cover it. Naming a shape of its own
 * is worth it for state that other code reads; otherwise leave `T` off and it is
 * inferred from `keys`. Either way, `set` and {@link UrlSync.keys} only take the
 * keys that were claimed.
 *
 * ```tsx
 * const url = useUrlSync<{ from: string; to: string }>(['from', 'to'], (values) =>
 *   setState((current) => ({ ...current, ...values })),
 * );
 *
 * url.set({ from: 'now-1h', to: 'now' });
 * ```
 *
 * Without a {@link UrlStateProvider} above, the values live in React state
 * rather than in the query string and stay local to this component. Everything
 * else works the same, so a consumer never has to branch on whether url syncing
 * is turned on.
 *
 * The keys are read once, on mount; changing them later has no effect. Which
 * url key a claim resolves to depends on what is already claimed, so a
 * component has to go through the returned {@link UrlSync} instead of touching
 * the query string itself.
 */
export function useUrlSync<T extends object>(
  keys: readonly (keyof T & string)[],
  onChange: (values: UrlValues<T>) => void,
): UrlSync<T> {
  const local = useLocalUrlState();
  const { registry, params, write } = useContext(UrlStateContext) ?? local;
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

  const values = useMemo(
    () => readValues<T>(params, claimed),
    [params, claimed],
  );

  // Held in a ref so that an inline callback does not count as a change.
  const latest = useRef(onChange);
  latest.current = onChange;

  // What onChange was last handed. React re-renders on a setState made here
  // before it commits, so the state the callback feeds is right by the time
  // anything can see it — an effect would leave one render showing the values
  // the component would have had if the URL were empty. Compared key by key
  // rather than by identity, since React is free to throw the memo above away.
  const applied = useRef<UrlValues<T> | undefined>(undefined);

  if (!applied.current || !sameValues(applied.current, values)) {
    applied.current = values;
    latest.current(values);
  }

  // Also a ref, so that `set` stays the same function for as long as the
  // component is mounted: the write comes off a context value that is replaced
  // on every location change, and a `set` that changed with it would churn
  // every callback a consumer builds on top of it.
  const writeLatest = useRef(write);
  writeLatest.current = write;

  const set = useCallback(
    (update: UrlValues<T>) => {
      const named: Record<string, string | undefined> = update;
      const mapped: Record<string, string | undefined> = {};

      for (const [key, value] of Object.entries(named)) {
        mapped[urlKeyOf(claimed, key)] = value;
      }

      writeLatest.current(mapped);
    },
    [claimed],
  );

  return useMemo(() => ({ keys: claimed, set }), [claimed, set]);
}

/**
 * The state a consumer falls back to without a {@link UrlStateProvider} above
 * it. The values live in React state and never reach the query string, and the
 * registry is the consumer's own, so its keys never collide with anyone's.
 */
function useLocalUrlState(): UrlState {
  const [registry] = useState(() => new UrlStateRegistry());
  const [params, setParams] = useState(() => new URLSearchParams());

  return useMemo(
    () => ({
      registry,
      params,
      write: (values: Record<string, string | undefined>) =>
        setParams((current) => applyValues(current, values)),
    }),
    [registry, params],
  );
}

/** Reads the claimed url keys out of `params`, under the claimed names. */
function readValues<T>(
  params: URLSearchParams,
  claimed: Readonly<Record<string, string>>,
): UrlValues<T> {
  const values: Record<string, string> = {};

  for (const [key, urlKey] of Object.entries(claimed)) {
    const value = params.get(urlKey);

    if (value !== null) {
      values[key] = value;
    }
  }

  return values as UrlValues<T>;
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
    throw new Error(`Url key "${key}" was not claimed by useUrlSync`);
  }

  return urlKey;
}
