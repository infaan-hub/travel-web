"use client";

import { useCallback, useEffect, useState } from "react";
import { readClientCache, writeClientCache } from "@/lib/cache/client-cache";

export function useCachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { ttlMs?: number; enabled?: boolean },
) {
  const ttlMs = options?.ttlMs ?? 5 * 60 * 1000;
  const enabled = options?.enabled ?? true;
  const [data, setData] = useState<T | null>(() => (enabled ? readClientCache<T>(key, ttlMs) : null));
  const [loading, setLoading] = useState<boolean>(() => enabled && readClientCache<T>(key, ttlMs) === null);
  const [error, setError] = useState<unknown>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
      writeClientCache(key, result, ttlMs);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [enabled, fetcher, key, ttlMs]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    fetcher()
      .then((result) => {
        if (!active) return;
        setData(result);
        writeClientCache(key, result, ttlMs);
      })
      .catch((err) => {
        if (!active) return;
        setError(err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [enabled, fetcher, key, ttlMs]);

  return { data, loading, error, refresh, setData };
}
