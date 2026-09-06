import { createContext, useContext, useState } from 'react';
import React from 'react';

import { MemoryCache } from './MemoryCache';

/**
 * Cache used when no {@link CacheProvider} is mounted above the consumer, so
 * components that cache state work out of the box. It is module scoped, which
 * means everything on the page shares it — wrap a subtree in a `CacheProvider`
 * to give it a cache of its own.
 */
const defaultCache = new MemoryCache();

export const CacheContext = createContext<MemoryCache>(defaultCache);

export interface CacheProviderProps {
  /** Cache to share with the subtree. Omit to create one for this provider. */
  cache?: MemoryCache;
  children: React.ReactNode;
}

export function CacheProvider({ cache, children }: CacheProviderProps) {
  const [ownCache] = useState(() => new MemoryCache());

  return (
    <CacheContext.Provider value={cache ?? ownCache}>
      {children}
    </CacheContext.Provider>
  );
}

/** Returns the closest cache, or the shared default one when there is no provider. */
export function useCache(): MemoryCache {
  return useContext(CacheContext);
}
