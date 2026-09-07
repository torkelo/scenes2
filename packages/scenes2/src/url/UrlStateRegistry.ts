/**
 * Hands out the query-string keys that state providers sync to, and reads and
 * writes those keys in the current URL.
 *
 * Two providers cannot both own the same key, so the second one to ask for it
 * is given a numbered key instead: the first `TimeRangeContextProvider` on the
 * page syncs to `from`/`to`, and one nested inside it syncs to `from2`/`to2`.
 * An owner holds its keys until it releases them, at which point the numbers
 * go back to whoever asks next.
 *
 * Writes replace the current history entry, so syncing state to the URL never
 * adds to the back stack.
 */
export class UrlStateRegistry {
  /** Owner id to the keys it asked for, mapped to the keys it was given. */
  #claims = new Map<string, Readonly<Record<string, string>>>();

  /** Every url key currently held by an owner. */
  #taken = new Set<string>();

  /**
   * Reserves a url key for each entry in `keys` and returns the mapping from
   * the requested key to the one this owner got.
   *
   * Claiming again under the same `owner` returns the mapping from the first
   * call, so a re-render never allocates a second set of keys. Release the
   * owner first to claim a different set.
   *
   * @param previous A mapping this owner held before, which it gets back as
   * long as every key in it is still free. An owner that releases and claims
   * again keeps the keys it had, whatever order the claims come back in.
   */
  public claim(
    owner: string,
    keys: readonly string[],
    previous?: Readonly<Record<string, string>>,
  ): Readonly<Record<string, string>> {
    const existing = this.#claims.get(owner);

    if (existing) {
      return existing;
    }

    const retaken = previous && this.#retake(keys, previous);

    if (retaken) {
      this.#claims.set(owner, retaken);

      return retaken;
    }

    const claimed: Record<string, string> = {};

    for (const key of keys) {
      claimed[key] = this.#allocate(key);
    }

    this.#claims.set(owner, claimed);

    return claimed;
  }

  /** Gives up every key held by `owner`. Values already in the URL stay there. */
  public release(owner: string): void {
    const claimed = this.#claims.get(owner);

    if (!claimed) {
      return;
    }

    for (const urlKey of Object.values(claimed)) {
      this.#taken.delete(urlKey);
    }

    this.#claims.delete(owner);
  }

  /** Returns the value the URL holds for `urlKey`, or undefined when it has none. */
  public read(urlKey: string): string | undefined {
    return new URL(window.location.href).searchParams.get(urlKey) ?? undefined;
  }

  /**
   * Writes `values` to the query string, replacing the current history entry.
   * A value of `undefined` removes its key. Writing values the URL already
   * holds leaves the history entry alone.
   */
  public write(values: Record<string, string | undefined>): void {
    const url = new URL(window.location.href);
    let changed = false;

    for (const [urlKey, value] of Object.entries(values)) {
      if (value === undefined) {
        if (url.searchParams.has(urlKey)) {
          url.searchParams.delete(urlKey);
          changed = true;
        }
      } else if (url.searchParams.get(urlKey) !== value) {
        url.searchParams.set(urlKey, value);
        changed = true;
      }
    }

    if (!changed) {
      return;
    }

    window.history.pushState(window.history.state, '', url);
  }

  /**
   * Takes back every key in `previous`, or nothing at all when it covers a
   * different set of keys than `keys` or one of them has gone to someone else.
   */
  #retake(
    keys: readonly string[],
    previous: Readonly<Record<string, string>>,
  ): Readonly<Record<string, string>> | undefined {
    const urlKeys = Object.values(previous);

    if (urlKeys.length !== keys.length) {
      return undefined;
    }

    for (const key of keys) {
      const urlKey = previous[key];

      if (urlKey === undefined || this.#taken.has(urlKey)) {
        return undefined;
      }
    }

    for (const urlKey of urlKeys) {
      this.#taken.add(urlKey);
    }

    return previous;
  }

  /** Takes `key` itself when it is free, or the first free `key2`, `key3`, … */
  #allocate(key: string): string {
    let candidate = key;
    let suffix = 1;

    while (this.#taken.has(candidate)) {
      suffix++;
      candidate = `${key}${suffix}`;
    }

    this.#taken.add(candidate);

    return candidate;
  }
}
