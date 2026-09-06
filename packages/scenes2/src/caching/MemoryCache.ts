/**
 * A value stored in a {@link MemoryCache} together with the time it goes stale.
 */
export interface CacheEntry<T = unknown> {
  value: T;
  /** Epoch ms from which the entry counts as stale. `Infinity` never goes stale. */
  expiresAt: number;
}

/**
 * In-memory key/value cache with a per-entry eviction time.
 *
 * Eviction is lazy: a stale entry stays in the map until something reads that key
 * or {@link MemoryCache.prune} runs. Nothing is written to storage, so the cache
 * lives as long as the page does.
 *
 * A value of `undefined` cannot be told apart from a miss by {@link MemoryCache.get},
 * so use {@link MemoryCache.has} when that distinction matters.
 */
export class MemoryCache {
  #entries = new Map<string, CacheEntry>();

  /**
   * Returns the value stored under `key`, or `undefined` when there is nothing
   * cached or the entry has gone stale.
   */
  public get<T>(key: string): T | undefined {
    return this.#read(key)?.value as T | undefined;
  }

  /** Returns true when `key` holds an entry that has not gone stale. */
  public has(key: string): boolean {
    return this.#read(key) !== undefined;
  }

  /**
   * Stores `value` under `key`.
   *
   * @param staleTime How long the value stays usable, in milliseconds, counted
   * from now. Omit it (or pass `Infinity`) to keep the value until it is deleted.
   * A `staleTime` of 0 or less stores a value that is already stale.
   */
  public set<T>(key: string, value: T, staleTime?: number): void {
    const expiresAt =
      staleTime === undefined || staleTime === Infinity
        ? Infinity
        : Date.now() + staleTime;

    this.#entries.set(key, { value, expiresAt });
  }

  /** Removes `key`. Returns true when there was an entry to remove. */
  public delete(key: string): boolean {
    return this.#entries.delete(key);
  }

  /** Removes every entry. */
  public clear(): void {
    this.#entries.clear();
  }

  /** Removes every stale entry. */
  public prune(): void {
    for (const [key, entry] of this.#entries) {
      if (isStale(entry)) {
        this.#entries.delete(key);
      }
    }
  }

  /** Number of entries that have not gone stale. */
  public get size(): number {
    this.prune();
    return this.#entries.size;
  }

  /** Reads an entry, dropping it first when it has gone stale. */
  #read(key: string): CacheEntry | undefined {
    const entry = this.#entries.get(key);

    if (!entry) {
      return undefined;
    }

    if (isStale(entry)) {
      this.#entries.delete(key);
      return undefined;
    }

    return entry;
  }
}

function isStale(entry: CacheEntry): boolean {
  return entry.expiresAt <= Date.now();
}
