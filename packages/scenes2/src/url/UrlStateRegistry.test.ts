import { beforeEach, describe, expect, it } from 'vitest';

import { UrlStateRegistry } from './UrlStateRegistry';

describe('UrlStateRegistry', () => {
  let registry: UrlStateRegistry;

  beforeEach(() => {
    registry = new UrlStateRegistry();
  });

  describe('claim', () => {
    it('gives the first owner the keys it asks for', () => {
      expect(registry.claim('a', ['from', 'to'])).toEqual({
        from: 'from',
        to: 'to',
      });
    });

    it('numbers the keys of every owner after the first', () => {
      registry.claim('a', ['from', 'to']);

      expect(registry.claim('b', ['from', 'to'])).toEqual({
        from: 'from2',
        to: 'to2',
      });
      expect(registry.claim('c', ['from', 'to'])).toEqual({
        from: 'from3',
        to: 'to3',
      });
    });

    it('only numbers the keys that are taken', () => {
      registry.claim('a', ['from']);

      expect(registry.claim('b', ['from', 'to'])).toEqual({
        from: 'from2',
        to: 'to',
      });
    });

    it('returns the same keys when the same owner claims again', () => {
      const first = registry.claim('a', ['from', 'to']);

      expect(registry.claim('a', ['from', 'to'])).toBe(first);
      expect(registry.claim('b', ['from'])).toEqual({ from: 'from2' });
    });

    it('hands a released key to the next owner', () => {
      registry.claim('a', ['from']);
      registry.claim('b', ['from']);
      registry.release('a');

      expect(registry.claim('c', ['from'])).toEqual({ from: 'from' });
      expect(registry.claim('d', ['from'])).toEqual({ from: 'from3' });
    });

    it('gives an owner the keys it held before back', () => {
      const outer = registry.claim('outer', ['from', 'to']);
      const inner = registry.claim('inner', ['from', 'to']);

      registry.release('outer');
      registry.release('inner');

      // Claimed back in the opposite order, the way effects run child before
      // parent: both owners still end up on the keys they started with.
      expect(registry.claim('inner', ['from', 'to'], inner)).toBe(inner);
      expect(registry.claim('outer', ['from', 'to'], outer)).toBe(outer);
    });

    it('allocates a fresh key when the one held before is taken', () => {
      const previous = registry.claim('a', ['from']);

      registry.release('a');
      registry.claim('b', ['from']);

      expect(registry.claim('a', ['from'], previous)).toEqual({
        from: 'from2',
      });
    });

    it('allocates fresh keys when the key set has changed', () => {
      const previous = registry.claim('a', ['from']);

      registry.release('a');

      expect(registry.claim('a', ['from', 'to'], previous)).toEqual({
        from: 'from',
        to: 'to',
      });
    });

    it('ignores a release for an owner that holds nothing', () => {
      registry.release('nobody');

      expect(registry.claim('a', ['from'])).toEqual({ from: 'from' });
    });
  });
});
