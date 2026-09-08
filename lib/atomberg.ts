import "server-only";
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

const ATOMBERG_BASE_URL = "https://api.developer.atomberg-iot.com";

function getCredentials() {
  const apiKey = process.env.ATOMBERG_API_KEY;
  const refreshToken = process.env.ATOMBERG_REFRESH_TOKEN;

  if (!apiKey || !refreshToken) {
    throw new Error(
      "Missing ATOMBERG_API_KEY or ATOMBERG_REFRESH_TOKEN in server environment."
    );
  }

  return { apiKey, refreshToken };
}

/**
 * Obtain a valid short-lived access token, using the cached token if fresh,
 * or exchanging the refresh token otherwise.
 */
export async function getAccessToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh) {
    const cached = getCachedAccessToken();
    if (cached) return cached;
  }

  const { apiKey, refreshToken } = getCredentials();

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
    const errorText = await response.text();
    throw new Error(
      `Failed to get access token (status ${response.status}): ${errorText}`
    );
  }

  const data = await response.json();
  const token = data?.message?.access_token || data?.data?.message?.access_token;

  if (!token || typeof token !== "string") {
    throw new Error("Invalid access token format received from Atomberg API");
  }

  // Cache access token for 55 minutes (~1 hour life)
  setCachedAccessToken(token, 55 * 60 * 1000);
  return token;
}

/**
 * Generic authenticated fetch helper for Atomberg API with automatic 401 refresh & retry.
 */
async function atombergFetch(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<Response> {
  const { apiKey } = getCredentials();
  const token = await getAccessToken(isRetry);

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
    invalidateAccessToken();
    return atombergFetch(endpoint, options, true);
  }

  return response;
}

/**
 * Normalize raw Atomberg device state to our structured NormalizedFanState.
 */
function normalizeFan(raw: RawAtombergState): NormalizedFanState {
  const meta = KNOWN_FANS[raw.device_id] || {
    id: raw.device_id,
    name: `Fan (${raw.device_id.slice(-4)})`,
    room: "Home",
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
 * Fetch all fans and their current state, utilizing the server cache unless ?refresh=1 is forced.
 */
export async function getFansState(forceRefresh = false): Promise<FansApiResponse> {
  if (!forceRefresh) {
    const cached = getCachedFanState();
    if (cached) {
      return {
        fans: cached.fans,
        cached: true,
        cachedAt: cached.cachedAt,
      };
    }
  }

  const response = await atombergFetch("/v1/get_device_state?device_id=all", {
    method: "GET",
  });

  if (response.status === 429) {
    // If rate limited but we have stale cache, return it
    const cached = getCachedFanState();
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
    const errText = await response.text();
    throw new Error(
      `Failed to get fan state from Atomberg API (status ${response.status}): ${errText}`
    );
  }

  const data = await response.json();
  
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

  // Normalize all devices returned
  const normalizedMap = new Map<string, NormalizedFanState>();
  for (const raw of rawList) {
    if (raw.device_id) {
      normalizedMap.set(raw.device_id, normalizeFan(raw));
    }
  }

  // Ensure all known device IDs are present in output even if a fan was temporarily omitted
  for (const deviceId of KNOWN_DEVICE_IDS) {
    if (!normalizedMap.has(deviceId)) {
      normalizedMap.set(
        deviceId,
        normalizeFan({
          device_id: deviceId,
          is_online: false,
          power: false,
          last_recorded_speed: 1,
        })
      );
    }
  }

  const normalized = Array.from(normalizedMap.values());
  setCachedFanState(normalized);

  return {
    fans: normalized,
    cached: false,
    cachedAt: Date.now(),
  };
}

/**
 * Send a command to a specific device.
 */
export async function sendFanCommand(
  deviceId: string,
  command: Record<string, unknown>
): Promise<{ ok: boolean; responseData?: unknown }> {
  if (!KNOWN_DEVICE_IDS.includes(deviceId)) {
    throw new Error(`Device ID ${deviceId} is not a recognized device.`);
  }

  const response = await atombergFetch("/v1/send_command", {
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
    const errText = await response.text();
    throw new Error(
      `Failed to send command to device ${deviceId} (status ${response.status}): ${errText}`
    );
  }

  const resJson = await response.json();
  return { ok: true, responseData: resJson };
}
