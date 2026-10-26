const CACHE_PREFIX = "travel.cache.v1.";
const DEFAULT_TTL_MS = 5 * 60 * 1000;

export function clientCacheKey(key: string): string {
  return `${CACHE_PREFIX}${key}`;
}

export function readClientCache<T>(key: string, ttlMs: number = DEFAULT_TTL_MS): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(clientCacheKey(key));
    if (!raw) return null;
    const entry = JSON.parse(raw) as { expires: number; data: T };
    if (!entry || typeof entry.expires !== "number") return null;
    if (Date.now() > entry.expires) {
      window.localStorage.removeItem(clientCacheKey(key));
      return null;
    }
    return entry.data as T;
  } catch {
    try {
      window.localStorage.removeItem(clientCacheKey(key));
    } catch {
      // Ignore storage cleanup failures.
    }
    return null;
  }
}

export function writeClientCache<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      clientCacheKey(key),
      JSON.stringify({ expires: Date.now() + ttlMs, data }),
    );
  } catch {
    // Storage can be unavailable or full; cache failures must never break rendering.
  }
}

export function removeClientCache(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(clientCacheKey(key));
  } catch {
    // Ignore storage failures.
  }
}

export function clearClientCache(prefix?: string): void {
  if (typeof window === "undefined") return;
  try {
    const fullPrefix = prefix ? clientCacheKey(prefix) : CACHE_PREFIX;
    const keys: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key && key.startsWith(fullPrefix)) keys.push(key);
    }
    for (const key of keys) window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}
