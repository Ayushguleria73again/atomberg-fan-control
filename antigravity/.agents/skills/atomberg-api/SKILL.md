---
name: atomberg-api
description: Reference for authenticating with and calling the Atomberg Cloud IoT API (base URL, access-token flow, get_list_of_devices, get_device_state, send_command) and the supported fan command keys (power, speed, led, sleep, timer). Use when writing or debugging any code that reads or controls Atomberg fans directly, or when implementing the no-hub direct-control mode. Do not use for Home Assistant service calls — use the home-assistant skill for those.
---

# Atomberg Cloud API

Full reference: `docs/03-atomberg-api.md`. In the default architecture, Home Assistant calls these — the app does not. This skill is for understanding HA's behavior and for the optional no-hub mode.

## Base URL
`https://api.developer.atomberg-iot.com`

## Auth
1. Human enables **Developer Options** in the Atomberg Home app → gets **API Key** + **Refresh Token**.
2. Exchange refresh token for an access token:
   ```
   GET /v1/get_access_token
   Authorization: Bearer <REFRESH_TOKEN>
   x-api-key: <API_KEY>
   Accept: application/json
   → data.message.access_token
   ```
3. All other calls send `Authorization: Bearer <ACCESS_TOKEN>` + `x-api-key: <API_KEY>`.
4. On `401`, re-fetch the access token and retry once.

## Endpoints
- `GET /v1/get_list_of_devices` → device_id, name, series, room.
- `GET /v1/get_device_state?device_id=all` (or a specific id) → is_online, power, speed, led, and model-specific fields.
- `POST /v1/send_command`
  ```json
  { "device_id": "<id>", "command": { "power": true, "speed": 3 } }
  ```

## Command keys
| Key | Values | Status |
|-----|--------|--------|
| `power` | true/false | verified |
| `speed` | 1–6 | verified |
| `led` | true/false | verified |
| `speed_delta` | +1/-1 | model-dependent |
| `sleep` | true/false | model-dependent |
| `timer` | 0..4 (off/1h/2h/3h/6h — confirm) | model-dependent |

## Status codes
200 ok · 401 token expired (refresh) · 403 developer mode off · 404 device not on account · 429 rate-limited (back off).

## Rate limits (design-critical)
Quota per API Key: **~100 calls/day**, **5 calls/sec**. Never poll the cloud for state — read state from Home Assistant (which listens to local Wi-Fi broadcasts) and reserve cloud calls for commands. In no-hub mode, cache state + listen for local broadcasts; do not poll.

## Constraints / Do not
- Never hardcode or log API key / refresh / access tokens. Read from env (`ATOMBERG_API_KEY`, `ATOMBERG_REFRESH_TOKEN`) — only in no-hub mode.
- Do not invent command keys beyond the verified three without confirming via `get_device_state`.
- Debounce and coalesce commands; the API rate-limits with `429`.
- Speed is 1–6; convert to HA percentage with `round(speed/6*100)`.
