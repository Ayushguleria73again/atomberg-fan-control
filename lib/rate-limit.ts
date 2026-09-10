import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// In-memory sliding window fallback for local dev or when Redis is unconfigured
class InMemorySlidingWindow {
  private windowMs: number;
  private maxRequests: number;
  private records = new Map<string, number[]>();

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  limit(identifier: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const timestamps = (this.records.get(identifier) || []).filter(
      (ts) => ts > windowStart
    );

    if (timestamps.length >= this.maxRequests) {
      const oldest = timestamps[0];
      const reset = oldest + this.windowMs;
      return {
        success: false,
        limit: this.maxRequests,
        remaining: 0,
        reset,
      };
    }

    timestamps.push(now);
    this.records.set(identifier, timestamps);

    return {
      success: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - timestamps.length,
      reset: now + this.windowMs,
    };
  }
}

// Initialize Upstash Redis client if env vars exist
const isUpstashConfigured = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const redis = isUpstashConfigured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

// Limiters:
// 1. Connect Rate Limiter: 5 requests per 60s
const upstashConnectLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "60 s"),
      prefix: "ratelimit:connect",
      analytics: true,
    })
  : null;
const inMemoryConnectLimiter = new InMemorySlidingWindow(5, 60_000);

// 2. Fan Command Rate Limiter: 15 commands per 10s (protects ~5 calls/sec quota)
const upstashCommandLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(15, "10 s"),
      prefix: "ratelimit:cmd",
      analytics: true,
    })
  : null;
const inMemoryCommandLimiter = new InMemorySlidingWindow(15, 10_000);

// 3. Fans Poll Rate Limiter: 30 requests per 60s
const upstashPollLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "60 s"),
      prefix: "ratelimit:poll",
      analytics: true,
    })
  : null;
const inMemoryPollLimiter = new InMemorySlidingWindow(30, 60_000);

export async function checkConnectRateLimit(
  identifier: string
): Promise<RateLimitResult> {
  if (upstashConnectLimiter) {
    try {
      const res = await upstashConnectLimiter.limit(identifier);
      return {
        success: res.success,
        limit: res.limit,
        remaining: res.remaining,
        reset: res.reset,
      };
    } catch {
      // Fall back to in-memory on Upstash network error
      return inMemoryConnectLimiter.limit(identifier);
    }
  }
  return inMemoryConnectLimiter.limit(identifier);
}

export async function checkFanCommandRateLimit(
  userId: string
): Promise<RateLimitResult> {
  if (upstashCommandLimiter) {
    try {
      const res = await upstashCommandLimiter.limit(userId);
      return {
        success: res.success,
        limit: res.limit,
        remaining: res.remaining,
        reset: res.reset,
      };
    } catch {
      return inMemoryCommandLimiter.limit(userId);
    }
  }
  return inMemoryCommandLimiter.limit(userId);
}

export async function checkFansPollRateLimit(
  userId: string
): Promise<RateLimitResult> {
  if (upstashPollLimiter) {
    try {
      const res = await upstashPollLimiter.limit(userId);
      return {
        success: res.success,
        limit: res.limit,
        remaining: res.remaining,
        reset: res.reset,
      };
    } catch {
      return inMemoryPollLimiter.limit(userId);
    }
  }
  return inMemoryPollLimiter.limit(userId);
}
