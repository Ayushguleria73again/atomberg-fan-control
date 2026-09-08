import { NormalizedFanState } from "./types";

interface CachedToken {
  token: string;
  expiresAt: number;
}

interface CachedState {
  fans: NormalizedFanState[];
  cachedAt: number;
}

// Global cache objects for serverless module longevity
let accessTokenCache: CachedToken | null = null;
let fanStateCache: CachedState | null = null;

// Access Token Cache
export function getCachedAccessToken(): string | null {
  if (!accessTokenCache) return null;
  // Consider token valid if it hasn't expired (leave 60s buffer)
  if (Date.now() < accessTokenCache.expiresAt - 60_000) {
    return accessTokenCache.token;
  }
  return null;
}

export function setCachedAccessToken(token: string, expiresInMs: number = 3600 * 1000): void {
  accessTokenCache = {
    token,
    expiresAt: Date.now() + expiresInMs,
  };
}

export function invalidateAccessToken(): void {
  accessTokenCache = null;
}

// Device State Cache (TTL: 45 seconds)
const STATE_CACHE_TTL_MS = 45_000;

export function getCachedFanState(): { fans: NormalizedFanState[]; cachedAt: number } | null {
  if (!fanStateCache) return null;
  const age = Date.now() - fanStateCache.cachedAt;
  if (age < STATE_CACHE_TTL_MS) {
    return fanStateCache;
  }
  return null;
}

export function setCachedFanState(fans: NormalizedFanState[]): void {
  fanStateCache = {
    fans,
    cachedAt: Date.now(),
  };
}

export function updateCachedFanOptimistic(
  deviceId: string,
  updates: Partial<NormalizedFanState>
): void {
  if (!fanStateCache) return;
  fanStateCache.fans = fanStateCache.fans.map((fan) =>
    fan.id === deviceId ? { ...fan, ...updates, lastUpdated: Date.now() } : fan
  );
}

export function invalidateFanState(): void {
  fanStateCache = null;
}
