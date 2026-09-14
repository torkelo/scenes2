import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { UrlStateProvider, useUrlSync } from './UrlStateContext';
import { UrlStateRegistry } from './UrlStateRegistry';

/** The shape a consumer declares, which its keys and writes go by. */
interface Filters {
  query?: string;
  page?: string;
}

/** What the hook hands back: the values it read, and the way to write them. */
type Sync = ReturnType<typeof useUrlSync<Filters>>;

const keys = ['query', 'page'] as const;

interface SyncedOptions {
  /** The query string the consumer mounts on. */
  entry?: string;
  /** A registry to hand the provider, instead of the one it makes itself. */
  registry?: UrlStateRegistry;
  /** Claims the same keys above the consumer, so it takes numbered ones. */
  nested?: boolean;
  /** Mounts the tree twice over, the way StrictMode does in development. */
  strict?: boolean;
}

/**
 * Mounts a consumer under a provider inside a router, and hands back what a
 * test does with it: read the values it was given, write through it, and move
 * around the way the rest of the app would.
 */
function renderSynced({
  entry = '/',
  registry,
  nested,
  strict,
}: SyncedOptions = {}) {
  const { result } = renderHook(
    () => ({
      sync: useUrlSync<Filters>(keys),
      location: useLocation(),
      navigate: useNavigate(),
    }),
    {
      reactStrictMode: strict,
      wrapper: ({ children }: { children: ReactNode }) => (
        <MemoryRouter initialEntries={[entry]}>
          <UrlStateProvider registry={registry}>
            {nested ? <OuterConsumer>{children}</OuterConsumer> : children}
          </UrlStateProvider>
        </MemoryRouter>
      ),
    },
  );

  return {
    ...consumer(() => result.current.sync),
    /** The query string as it stands, which is where a write lands. */
    search: () => result.current.location.search,
    /** Changes the query string from outside, the way a `Link` would. */
    goTo: (search: string) =>
      act(() => {
        result.current.navigate({ search });
      }),
    /** Steps back through the history, the way the back button would. */
    goBack: () =>
      act(() => {
        result.current.navigate(-1);
      }),
  };
}

/**
 * Mounts two consumers with no provider above them, which is where they fall
 * back to React state.
 */
function renderLocal() {
  const { result } = renderHook(() => [
    useUrlSync<Filters>(keys),
    useUrlSync<Filters>(keys),
  ]);

  return {
    first: consumer(() => result.current[0]),
    second: consumer(() => result.current[1]),
  };
}

/** The reads and writes of one mounted consumer, with `act` taken care of. */
function consumer(read: () => Sync) {
  return {
    /** The values the consumer was last given. */
    state: () => read()[0],
    /** Writes through the consumer. Several updates land in the same tick. */
    update: (...updates: Filters[]) =>
      act(() => {
        for (const values of updates) {
          read()[1](values);
        }
      }),
  };
}

/** A consumer above the one under test, holding the unnumbered keys. */
function OuterConsumer({ children }: { children: ReactNode }) {
  useUrlSync<Filters>(keys);

  return <>{children}</>;
}

describe('useUrlSync', () => {
  describe('under a provider', () => {
    it('hands over the values the consumer mounted on', () => {
      const synced = renderSynced({ entry: '/?query=cpu&page=3' });

      expect(synced.state()).toEqual({ query: 'cpu', page: '3' });
    });

    it('leaves out keys the query string has no value for', () => {
      const synced = renderSynced({ entry: '/?page=3&unrelated=1' });

      expect(synced.state()).toEqual({ page: '3' });
    });

    it('hands over the new values when the location changes', () => {
      const synced = renderSynced();

      expect(synced.state()).toEqual({});

      synced.goTo('?query=mem&page=1');

      expect(synced.state()).toEqual({ query: 'mem', page: '1' });
    });

    it('writes a value to the query string', () => {
      const synced = renderSynced({ entry: '/?unrelated=1' });

      synced.update({ query: 'cpu' });

      expect(synced.state()).toEqual({ query: 'cpu' });
      expect(synced.search()).toBe('?unrelated=1&query=cpu');
    });

    it('removes a key written as undefined', () => {
      const synced = renderSynced({ entry: '/?query=cpu&page=3' });

      synced.update({ query: undefined });

      expect(synced.state()).toEqual({ page: '3' });
      expect(synced.search()).toBe('?page=3');
    });

    it('stacks two writes made in the same tick', () => {
      const synced = renderSynced();

      synced.update({ query: 'cpu' }, { page: '2' });

      expect(synced.state()).toEqual({ query: 'cpu', page: '2' });
      expect(synced.search()).toBe('?query=cpu&page=2');
    });

    it('leaves the history alone for a write that changes nothing', () => {
      const synced = renderSynced();

      synced.update({ query: 'cpu' });
      synced.update({ query: 'cpu' });
      synced.goBack();

      // One entry for the write that changed something, and none for the one
      // that did not, or the back button would look broken.
      expect(synced.search()).toBe('');
    });

    it('gives a nested consumer numbered keys', () => {
      const synced = renderSynced({
        entry: '/?query=outer&query2=inner',
        nested: true,
      });

      expect(synced.state()).toEqual({ query: 'inner' });

      synced.update({ query: 'mem' });

      expect(synced.state()).toEqual({ query: 'mem' });
      expect(synced.search()).toBe('?query=outer&query2=mem');
    });

    it('keeps the numbered keys across a StrictMode remount', () => {
      // The remount releases both consumers and claims again child before
      // parent, the reverse of the order the keys went out in. Without the
      // re-claim by name, the two swap keys on the next render and the nested
      // consumer starts reading `query` out from under its parent.
      const synced = renderSynced({
        entry: '/?query=outer&query2=inner',
        nested: true,
        strict: true,
      });

      expect(synced.state()).toEqual({ query: 'inner' });

      synced.update({ query: 'mem' });

      expect(synced.state()).toEqual({ query: 'mem' });
      expect(synced.search()).toBe('?query=outer&query2=mem');
    });

    it('takes a registry from the provider', () => {
      const registry = new UrlStateRegistry();

      renderSynced({ registry });

      // The consumer's keys came out of the registry passed in, so the next
      // owner to ask for them is given numbered ones.
      expect(registry.claim('other', keys)).toEqual({
        query: 'query2',
        page: 'page2',
      });
    });
  });

  describe('without a provider', () => {
    it('keeps the values in React state and out of the query string', () => {
      const { search } = window.location;
      const local = renderLocal();

      expect(local.first.state()).toEqual({});

      local.first.update({ query: 'cpu' });

      expect(local.first.state()).toEqual({ query: 'cpu' });
      expect(window.location.search).toBe(search);
    });

    it('keeps two consumers from seeing each other', () => {
      const local = renderLocal();

      local.first.update({ query: 'cpu' });
      local.second.update({ page: '2' });

      expect(local.first.state()).toEqual({ query: 'cpu' });
      expect(local.second.state()).toEqual({ page: '2' });
    });
  });
});
