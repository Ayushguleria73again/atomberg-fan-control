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
import { atombergConnections, userDevices, UserDevice } from "./db/schema";
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
 * Fetch and upsert user's devices list from Atomberg Cloud into the user_devices table.
 */
export async function syncUserDevices(
  userId: string
): Promise<{ count: number; added: string[]; total: number }> {
  try {
    const response = await atombergFetchForUser(userId, "/v1/get_list_of_devices", {
      method: "GET",
    });

    if (!response.ok) {
      return { count: 0, added: [], total: 0 };
    }

    const data = await response.json().catch(() => null);
    let deviceList: Array<Record<string, any>> = [];

    if (Array.isArray(data?.message?.device_list)) {
      deviceList = data.message.device_list;
    } else if (Array.isArray(data?.data?.device_list)) {
      deviceList = data.data.device_list;
    } else if (Array.isArray(data?.device_list)) {
      deviceList = data.device_list;
    } else if (Array.isArray(data?.message)) {
      deviceList = data.message;
    } else if (Array.isArray(data?.data)) {
      deviceList = data.data;
    } else if (Array.isArray(data)) {
      deviceList = data;
    }

    const existingRows = await db
      .select({ deviceId: userDevices.deviceId })
      .from(userDevices)
      .where(eq(userDevices.userId, userId));
    const existingSet = new Set(existingRows.map((r) => r.deviceId));
    const added: string[] = [];

    for (const dev of deviceList) {
      const deviceId = dev.device_id || dev.id;
      if (!deviceId) continue;

      const idStr = String(deviceId);
      const isNewDevice = !existingSet.has(idStr);
      if (isNewDevice) {
        added.push(idStr);
      }

      const name = dev.name || dev.device_name || `Atomberg Fan ${idStr.slice(-4)}`;
      const room = dev.room || dev.room_name || "Home";
      const series = dev.series || dev.device_type || "Smart";
      const model = dev.model || "Renesa";

      await db
        .insert(userDevices)
        .values({
          userId,
          deviceId: idStr,
          name: String(name),
          room: String(room),
          series: String(series),
          model: String(model),
          isNew: isNewDevice,
          lastSeenAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [userDevices.userId, userDevices.deviceId],
          set: {
            name: String(name),
            room: String(room),
            series: String(series),
            model: String(model),
            lastSeenAt: new Date(),
          },
        });
    }

    return { count: deviceList.length, added, total: deviceList.length };
  } catch {
    return { count: 0, added: [], total: 0 };
  }
}

/**
 * Get device metadata map from Postgres for a user.
 */
export async function getUserDeviceMetadata(userId: string): Promise<Map<string, UserDevice>> {
  const rows = await db
    .select()
    .from(userDevices)
    .where(eq(userDevices.userId, userId));

  const map = new Map<string, UserDevice>();
  for (const row of rows) {
    map.set(row.deviceId, row);
  }
  return map;
}

/**
 * Normalize raw Atomberg device state to our structured NormalizedFanState,
 * prioritizing caller's per-user device metadata: custom_name > Atomberg name > fallback.
 */
function normalizeFan(raw: RawAtombergState, meta?: UserDevice | null): NormalizedFanState {
  const deviceId = raw.device_id;
  const name =
    meta?.customName ||
    meta?.name ||
    raw.device_name ||
    raw.name ||
    `Fan (${deviceId.slice(-4)})`;
  const room = meta?.room || raw.room_name || raw.room || "Home";
  const model = meta?.model || raw.model || "Smart Fan";
  const series = meta?.series || raw.series || "Renesa";

  const hasLed =
    raw.has_led !== undefined
      ? Boolean(raw.has_led)
      : raw.led !== undefined
      ? true
      : series.toLowerCase().includes("studio") ||
        model.toLowerCase().includes("studio") ||
        name.toLowerCase().includes("studio") ||
        series.toLowerCase().includes("renesa") ||
        model.toLowerCase().includes("renesa");

  const hasSleep =
    raw.has_sleep !== undefined
      ? Boolean(raw.has_sleep)
      : raw.sleep !== undefined || raw.sleep_mode !== undefined
      ? true
      : true;

  const hasTimer =
    raw.has_timer !== undefined
      ? Boolean(raw.has_timer)
      : raw.timer !== undefined || raw.timer_hours !== undefined
      ? true
      : true;

  return {
    id: deviceId,
    name,
    room,
    model,
    series,
    online: raw.is_online ?? true,
    power: raw.power ?? false,
    speed: raw.last_recorded_speed ?? raw.speed ?? 1,
    led: raw.led ?? false,
    sleep: raw.sleep_mode ?? raw.sleep ?? false,
    timerHours: raw.timer_hours ?? raw.timer ?? 0,
    hasLed,
    hasSleep,
    hasTimer,
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

  // Load user's device metadata (custom names, rooms) from database
  let metaMap = await getUserDeviceMetadata(userId);

  // If no device metadata records exist yet in DB, sync from Atomberg list
  if (metaMap.size === 0 && rawList.length > 0) {
    await syncUserDevices(userId);
    metaMap = await getUserDeviceMetadata(userId);
  }

  const normalizedMap = new Map<string, NormalizedFanState>();
  for (const raw of rawList) {
    if (raw.device_id) {
      const meta = metaMap.get(raw.device_id);
      if (meta?.hidden) continue; // Skip hidden devices
      normalizedMap.set(raw.device_id, normalizeFan(raw, meta));
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
