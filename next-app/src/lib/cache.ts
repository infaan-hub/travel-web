import "server-only";
import { env } from "@/lib/env";
import { logger } from "@/lib/logging";

const memory = new Map<string, { value: string; expiresAt: number }>();

async function redisCommand(command: (string | number)[]): Promise<unknown> {
  const config = env();
  if (!config.CACHE_URL || !config.CACHE_TOKEN) throw new Error("cache not configured");
  const response = await fetch(config.CACHE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.CACHE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!response.ok) throw new Error(`cache responded ${response.status}`);
  const payload = (await response.json()) as { result?: unknown };
  return payload.result;
}

/**
 * Shared cache with an in-process fallback. Uses Upstash Redis when
 * CACHE_URL and CACHE_TOKEN are configured so values are shared between
 * serverless instances.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const config = env();
  if (config.CACHE_URL && config.CACHE_TOKEN) {
    try {
      const value = await redisCommand(["GET", key]);
      return value ? (JSON.parse(String(value)) as T) : null;
    } catch (error) {
      logger.warn("cache read failed, using local cache", {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  const entry = memory.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memory.delete(key);
    return null;
  }
  return JSON.parse(entry.value) as T;
}

export async function cacheSet(key: string, value: unknown, ttlMs: number): Promise<void> {
  const serialized = JSON.stringify(value);
  const config = env();
  if (config.CACHE_URL && config.CACHE_TOKEN) {
    try {
      await redisCommand(["SET", key, serialized, "PX", String(ttlMs)]);
      return;
    } catch (error) {
      logger.warn("cache write failed, using local cache", {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  memory.set(key, { value: serialized, expiresAt: Date.now() + ttlMs });
}

export async function cacheDelete(key: string): Promise<void> {
  const config = env();
  if (config.CACHE_URL && config.CACHE_TOKEN) {
    try {
      await redisCommand(["DEL", key]);
    } catch {
      // Fall through to the local cache.
    }
  }
  memory.delete(key);
}
