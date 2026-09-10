import { KNOWN_FANS, KNOWN_DEVICE_IDS } from "./fanMeta";
import {
  getCachedAccessToken,
  setCachedAccessToken,
  invalidateAccessToken,
  getCachedFanState,
  setCachedFanState,
} from "./cache";
import {
  NormalizedFanState,
  RawAtombergState,
  FansApiResponse,
} from "./types";
import { db } from "./db";
import { atombergConnections } from "./db/schema";
import { eq } from "drizzle-orm";
import { decryptCredentials } from "./crypto/encryption";

const ATOMBERG_BASE_URL = "https://api.developer.atomberg-iot.com";

/**
 * Retrieve and decrypt credentials for a specific user.
 * Plaintext is never returned to callers or saved outside local scope.
 */
async function getUserCredentials(userId: string): Promise<{ apiKey: string; refreshToken: string }> {
  const rows = await db
    .select()
    .from(atombergConnections)
    .where(eq(atombergConnections.userId, userId))
    .limit(1);

  if (!rows.length) {
    throw new Error("No connected Atomberg account found. Please connect your credentials on /connect.");
  }

  const conn = rows[0];
  const creds = decryptCredentials({
    encCredentials: conn.encCredentials,
    iv: conn.iv,
    authTag: conn.authTag,
  });

  // Asynchronously update lastUsedAt
  db.update(atombergConnections)
    .set({ lastUsedAt: new Date() })
    .where(eq(atombergConnections.id, conn.id))
    .catch(() => {});

  return creds;
}

/**
 * Obtain a valid short-lived access token for a user, using cached token if fresh,
 * or exchanging the decrypted refresh token otherwise.
 */
export async function getAccessTokenForUser(
  userId: string,
  forceRefresh = false
): Promise<{ token: string; apiKey: string }> {
  const { apiKey, refreshToken } = await getUserCredentials(userId);

  if (!forceRefresh) {
    const cached = getCachedAccessToken(userId);
    if (cached) return { token: cached, apiKey };
  }

  const response = await fetch(`${ATOMBERG_BASE_URL}/v1/get_access_token`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${refreshToken.trim()}`,
      "x-api-key": apiKey.trim(),
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        "Your Atomberg API Key or Refresh Token is expired or invalid. Please update your credentials."
      );
    }
    if (response.status === 429) {
      throw new Error("Atomberg rate limit reached. Please wait a few moments and try again.");
    }
    throw new Error(
      `Failed to get access token from Atomberg (status ${response.status}): ${errorText}`
    );
  }

  const data = await response.json().catch(() => null);
  const token = data?.message?.access_token || data?.data?.message?.access_token;

  if (!token || typeof token !== "string") {
    throw new Error("Invalid access token format received from Atomberg API");
  }

  // Cache access token for 55 minutes (~1 hour life)
  setCachedAccessToken(userId, token, 55 * 60 * 1000);
  return { token, apiKey };
}

/**
 * Authenticated fetch helper for Atomberg API with automatic 401 refresh & retry.
 */
async function atombergFetchForUser(
  userId: string,
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<Response> {
  const { token, apiKey } = await getAccessTokenForUser(userId, isRetry);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "x-api-key": apiKey.trim(),
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(`${ATOMBERG_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (response.status === 401 && !isRetry) {
    invalidateAccessToken(userId);
    return atombergFetchForUser(userId, endpoint, options, true);
  }

  return response;
}

/**
 * Normalize raw Atomberg device state to our structured NormalizedFanState.
 */
function normalizeFan(raw: RawAtombergState): NormalizedFanState {
  const meta = KNOWN_FANS[raw.device_id] || {
    id: raw.device_id,
    name: raw.device_name || `Fan (${raw.device_id.slice(-4)})`,
    room: "Room",
    model: "renesa+",
    series: "R2",
    hasLed: true,
    hasSleep: true,
    hasTimer: true,
  };

  return {
    id: raw.device_id,
    name: meta.name,
    room: meta.room,
    model: meta.model,
    series: meta.series,
    online: raw.is_online ?? true,
    power: raw.power ?? false,
    speed: raw.last_recorded_speed ?? raw.speed ?? 1,
    led: raw.led ?? false,
    sleep: raw.sleep_mode ?? raw.sleep ?? false,
    timerHours: raw.timer_hours ?? raw.timer ?? 0,
    hasLed: meta.hasLed,
    hasSleep: meta.hasSleep,
    hasTimer: meta.hasTimer,
    lastUpdated: raw.ts_epoch_seconds
      ? raw.ts_epoch_seconds * 1000
      : Date.now(),
  };
}

/**
 * Fetch all fans and their current state for a specific user, utilizing the per-user server cache.
 */
export async function getFansStateForUser(
  userId: string,
  forceRefresh = false
): Promise<FansApiResponse> {
  if (!forceRefresh) {
    const cached = getCachedFanState(userId);
    if (cached) {
      return {
        fans: cached.fans,
        cached: true,
        cachedAt: cached.cachedAt,
      };
    }
  }

  const response = await atombergFetchForUser(
    userId,
    "/v1/get_device_state?device_id=all",
    { method: "GET" }
  );

  if (response.status === 429) {
    const cached = getCachedFanState(userId);
    if (cached) {
      return {
        fans: cached.fans,
        cached: true,
        cachedAt: cached.cachedAt,
      };
    }
    throw new Error("Atomberg API rate limit reached (~100 calls/day). Please try again shortly.");
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(
      `Failed to get fan state from Atomberg API (status ${response.status}): ${errText}`
    );
  }

  const data = await response.json().catch(() => null);
  
  let rawList: RawAtombergState[] = [];
  if (Array.isArray(data?.message?.device_state)) {
    rawList = data.message.device_state;
  } else if (Array.isArray(data?.data?.device_state)) {
    rawList = data.data.device_state;
  } else if (Array.isArray(data?.device_state)) {
    rawList = data.device_state;
  } else if (Array.isArray(data)) {
    rawList = data;
  } else if (Array.isArray(data?.message)) {
    rawList = data.message;
  } else if (Array.isArray(data?.data)) {
    rawList = data.data;
  } else if (Array.isArray(data?.response)) {
    rawList = data.response;
  } else if (data?.data && typeof data.data === "object") {
    rawList = Object.values(data.data);
  } else if (data?.message && typeof data.message === "object") {
    rawList = Object.values(data.message);
  }

  const normalizedMap = new Map<string, NormalizedFanState>();
  for (const raw of rawList) {
    if (raw.device_id) {
      normalizedMap.set(raw.device_id, normalizeFan(raw));
    }
  }

  const normalized = Array.from(normalizedMap.values());
  setCachedFanState(userId, normalized);

  return {
    fans: normalized,
    cached: false,
    cachedAt: Date.now(),
  };
}

/**
 * Send a command to a specific device for a user with strict ownership verification.
 */
export async function sendFanCommandForUser(
  userId: string,
  deviceId: string,
  command: Record<string, unknown>
): Promise<{ ok: boolean; responseData?: unknown }> {
  let state = getCachedFanState(userId);
  if (!state) {
    state = await getFansStateForUser(userId, false);
  }

  const userOwnsDevice = state.fans.some((f) => f.id === deviceId);

  if (!userOwnsDevice) {
    throw new Error(`Forbidden: Device ID ${deviceId} does not belong to your account.`);
  }

  const response = await atombergFetchForUser(userId, "/v1/send_command", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      device_id: deviceId,
      command,
    }),
  });

  if (response.status === 429) {
    throw new Error("Atomberg API rate limit reached (5 calls/sec or 100/day limit).");
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(
      `Failed to send command to device ${deviceId} (status ${response.status}): ${errText}`
    );
  }

  const resJson = await response.json().catch(() => ({}));
  return { ok: true, responseData: resJson };
}
