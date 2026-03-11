export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  updatedAt: number;
}

export interface CacheMeta {
  updatedAt?: number;
  expiresAt?: number;
  isStale: boolean;
  ageSeconds?: number;
}

export class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): { value: T | null; meta: CacheMeta } {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) {
      return { value: null, meta: { isStale: true } };
    }

    const now = Date.now();
    const isStale = entry.expiresAt <= now;

    return {
      value: isStale ? null : entry.value,
      meta: {
        updatedAt: entry.updatedAt,
        expiresAt: entry.expiresAt,
        isStale,
        ageSeconds: Math.floor((now - entry.updatedAt) / 1000)
      }
    };
  }

  getStale<T>(key: string): { value: T | null; meta: CacheMeta } {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) {
      return { value: null, meta: { isStale: true } };
    }

    return {
      value: entry.value,
      meta: {
        updatedAt: entry.updatedAt,
        expiresAt: entry.expiresAt,
        isStale: entry.expiresAt <= Date.now(),
        ageSeconds: Math.floor((Date.now() - entry.updatedAt) / 1000)
      }
    };
  }

  set<T>(key: string, value: T, ttlSeconds: number): T {
    this.store.set(key, {
      value,
      updatedAt: Date.now(),
      expiresAt: Date.now() + ttlSeconds * 1000
    });
    return value;
  }

  delete(key: string): void {
    this.store.delete(key);
  }
}

export const memoryCache = new MemoryCache();
