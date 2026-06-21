import "server-only";

export type CacheEntry<T> = {
  value: T;
  createdAt: number;
  staleAt: number;
  expiresAt: number;
};

export type MemoryCacheOptions = {
  ttlMs: number;
  staleTtlMs?: number;
  maxEntries?: number;
};

/**
 * In-process TTL cache with stale-while-revalidate semantics.
 * Suitable for single-instance Docker deployments; Redis can replace this layer later.
 */
export class MemoryCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly ttlMs: number;
  private readonly staleTtlMs: number;
  private readonly maxEntries: number;

  constructor(options: MemoryCacheOptions) {
    this.ttlMs = options.ttlMs;
    this.staleTtlMs = options.staleTtlMs ?? Math.floor(options.ttlMs / 2);
    this.maxEntries = options.maxEntries ?? 100;
  }

  get(key: string): CacheEntry<T> | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry;
  }

  getStale(key: string): CacheEntry<T> | undefined {
    return this.store.get(key);
  }

  set(key: string, value: T): CacheEntry<T> {
    if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) {
        this.store.delete(oldestKey);
      }
    }

    const now = Date.now();
    const entry: CacheEntry<T> = {
      value,
      createdAt: now,
      staleAt: now + this.staleTtlMs,
      expiresAt: now + this.ttlMs,
    };

    this.store.set(key, entry);
    return entry;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  isFresh(entry: CacheEntry<T>): boolean {
    return Date.now() <= entry.staleAt;
  }
}
