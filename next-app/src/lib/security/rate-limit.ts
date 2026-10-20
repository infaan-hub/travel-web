import { ApiError } from "@/lib/api/http";
import { env } from "@/lib/env";
import { logger } from "@/lib/logging";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

/** In-process fallback used when no shared store is configured. */
function localRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  existing.count += 1;
  return {
    allowed: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
  };
}

async function upstashCommand(command: string[]): Promise<unknown> {
  const config = env();
  if (!config.RATE_LIMIT_URL || !config.RATE_LIMIT_TOKEN) throw new Error("not configured");
  const response = await fetch(config.RATE_LIMIT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.RATE_LIMIT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!response.ok) throw new Error(`rate limit store responded ${response.status}`);
  const payload = (await response.json()) as { result?: unknown };
  return payload.result;
}

/**
 * Shared fixed-window limiter. Uses Upstash Redis when RATE_LIMIT_URL and
 * RATE_LIMIT_TOKEN are configured so limits are consistent across serverless
 * instances, and falls back to an in-process map otherwise.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const config = env();
  if (config.RATE_LIMIT_URL && config.RATE_LIMIT_TOKEN) {
    try {
      const bucket = Math.floor(Date.now() / windowMs);
      const redisKey = `rl:${key}:${bucket}`;
      const count = Number(await upstashCommand(["INCR", redisKey]));
      if (count === 1) {
        await upstashCommand(["PEXPIRE", redisKey, String(windowMs + 1000)]);
      }
      const resetAt = (bucket + 1) * windowMs;
      return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        resetAt,
      };
    } catch (error) {
      logger.warn("rate limit store unavailable, using local limiter", {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return localRateLimit(key, limit, windowMs);
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") || "unknown";
}

export async function enforceRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number,
): Promise<void> {
  const result = await rateLimit(`${scope}:${clientIp(request)}`, limit, windowMs);
  if (!result.allowed) {
    const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
    throw new ApiError(
      429,
      `Too many requests. Try again in ${retryAfter} seconds.`,
      { retry_after: retryAfter },
    );
  }
}
