import { NormalizedFanState } from "./types";

interface CachedToken {
  token: string;
  expiresAt: number;
}

interface CachedState {
  fans: NormalizedFanState[];
  cachedAt: number;
}

// In-memory per-user cache maps for serverless module instances
const accessTokenCacheMap = new Map<string, CachedToken>();
const fanStateCacheMap = new Map<string, CachedState>();

// Access Token Cache per user
export function getCachedAccessToken(userId: string): string | null {
  const cached = accessTokenCacheMap.get(userId);
  if (!cached) return null;
  // Consider token valid if it hasn't expired (leave 60s buffer)
  if (Date.now() < cached.expiresAt - 60_000) {
    return cached.token;
  }
  return null;
}

export function setCachedAccessToken(
  userId: string,
  token: string,
  expiresInMs: number = 3600 * 1000
): void {
  accessTokenCacheMap.set(userId, {
    token,
    expiresAt: Date.now() + expiresInMs,
  });
}

export function invalidateAccessToken(userId: string): void {
  accessTokenCacheMap.delete(userId);
}

// Device State Cache (TTL: 45 seconds)
const STATE_CACHE_TTL_MS = 45_000;

export function getCachedFanState(
  userId: string
): { fans: NormalizedFanState[]; cachedAt: number } | null {
  const cached = fanStateCacheMap.get(userId);
  if (!cached) return null;
  const age = Date.now() - cached.cachedAt;
  if (age < STATE_CACHE_TTL_MS) {
    return cached;
  }
  return null;
}

export function setCachedFanState(
  userId: string,
  fans: NormalizedFanState[]
): void {
  fanStateCacheMap.set(userId, {
    fans,
    cachedAt: Date.now(),
  });
}

export function updateCachedFanOptimistic(
  userId: string,
  deviceId: string,
  updates: Partial<NormalizedFanState>
): void {
  const cached = fanStateCacheMap.get(userId);
  if (!cached) return;
  cached.fans = cached.fans.map((fan) =>
    fan.id === deviceId ? { ...fan, ...updates, lastUpdated: Date.now() } : fan
  );
}

export function invalidateFanState(userId: string): void {
  fanStateCacheMap.delete(userId);
}
