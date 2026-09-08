# 03 — Atomberg Cloud API Reference

> **Verification note.** The base URL, auth flow, the four endpoints, and the `power` / `speed` / `led` commands are **verified** from Atomberg's developer portal and open-source integrations (Home Assistant, Homebridge, Node-RED). Commands marked ⚠️ vary by fan series — confirm them with a `get_device_state` call on your fan before relying on them. Always treat the official portal as the source of truth: <https://developer.atomberg-iot.com/>

In the recommended architecture, **Home Assistant** calls these endpoints for you and the app never touches them. This reference exists so Antigravity understands what HA is doing — and so a direct (no-hub) mode is possible.

## Base URL

```
https://api.developer.atomberg-iot.com
```

## Getting credentials (human step)

**Prerequisites (from the Atomberg developer portal):**
- One or more **Wi-Fi-enabled** Atomberg smart fans, already added and working in the **Atomberg Home** app.
- Credentials only control devices on the **same account** used to generate them.

**Steps:**
1. Open the **Atomberg Home** mobile app (confirm your fans appear and work there first).
2. Go to **Profile / Account → Settings**.
3. Find **Developer Options** (some versions: *Developer Mode* / *Developer*) and **enable** it.
4. The app generates and displays your **API Key** (starts `tw…`) and **Refresh Token** (a JWT, starts `ey…`). Copy both.
5. Full quickstart: <https://developer.atomberg-iot.com/#overview>.

> If Developer Options isn't visible, update the app; older versions hid it. If still missing, the fan may not be a Wi-Fi smart model — contact Atomberg support. The API returns `403` if developer mode is disabled for the account.

## ⚠️ Rate limits (design-critical)

The developer portal states the quota per API Key is:

- **100 API calls per day**
- **5 calls per second** (throttle)

This is very low. **Do not poll the cloud API for state.** Instead:
- Home Assistant / the community integrations **listen to the fans' local Wi-Fi broadcasts** for near-real-time state, spending cloud calls only on actual commands + occasional sync.
- In the default (hub) architecture the app reads state from **Home Assistant**, which is free and local — the daily 100-call budget is only touched when you send commands.
- In no-hub mode, you must implement the same discipline: cache state, listen for local broadcasts, and reserve cloud calls for commands. Exceeding the quota returns `429`.

## Authentication flow

Two tokens: a long-lived **refresh token** (from the app) that you exchange for a short-lived **access token** used on every other call.

### 1. Get an access token

```
GET /v1/get_access_token
Host: api.developer.atomberg-iot.com
Authorization: Bearer <REFRESH_TOKEN>
x-api-key: <API_KEY>
Accept: application/json
```

Response (shape):

```json
{
  "status": "Success",
  "message": {
    "access_token": "<ACCESS_TOKEN>"
  }
}
```

Use `data.message.access_token`. Cache it and refresh when you get a `401`.

## Endpoints

All calls (except `get_access_token`) use:

```
Authorization: Bearer <ACCESS_TOKEN>
x-api-key: <API_KEY>
Accept: application/json
```

### 2. List devices

```
GET /v1/get_list_of_devices
```

Returns the fans on your account with their `device_id`, name, model/series, and room. Supported series include R1–R3, K1, I1–I5, M1–M2, S1–S2. Store the `device_id`s — every command needs one.

### 3. Get device state

```
GET /v1/get_device_state?device_id=all
# or a specific device:
GET /v1/get_device_state?device_id=<DEVICE_ID>
```

Returns per-device state. Fields observed across models: `is_online`, `power`, `last_recorded_speed` / `speed`, `led`, `sleep`, `timer`, and on LED models `brightness` / `light_mode`. **Read this once per model to learn exactly which fields your fan reports** — it's the ground truth for what you can command.

### 4. Send a command

```
POST /v1/send_command
Content-Type: application/json

{
  "device_id": "<DEVICE_ID>",
  "command": { "power": true }
}
```

The `command` object holds one or more key/value pairs:

| Key | Type / values | Status | Notes |
|-----|---------------|--------|-------|
| `power` | `true` / `false` | ✅ verified | On / off. |
| `speed` | `1`–`6` | ✅ verified | Absolute speed. |
| `led` | `true` / `false` | ✅ verified | Underlight/LED on LED models. |
| `speed_delta` | `+1` / `-1` | ⚠️ model-dependent | Nudge speed up/down. |
| `sleep` | `true` / `false` | ⚠️ model-dependent | Sleep mode (gradual speed reduction). |
| `timer` | `0,1,2,3,4` | ⚠️ model-dependent | Off-timer. Common mapping: `0`=off, `1`=1h, `2`=2h, `3`=3h, `4`=6h — **confirm for your model.** |
| `brightness_delta` | `+/-` step | ⚠️ LED models only | Adjust LED brightness. |
| `light_mode` | model-specific | ⚠️ RGB models only | Color/scene on RGB underlight models. |

Example — bedroom fan on at speed 3:

```json
{ "device_id": "abc123", "command": { "power": true, "speed": 3 } }
```

## Status codes

| Code | Meaning | Handle by |
|------|---------|-----------|
| `200` | Success | — |
| `401` | Access token expired | Call `get_access_token` again, retry once |
| `403` | Developer mode disabled | Re-enable Developer Options in the app |
| `404` | Device not on this account | Re-fetch `get_list_of_devices` |
| `429` | Rate limit exceeded | Back off; **this is why we front the API with Home Assistant** |

## Practical guidance for Antigravity

- **Never** hardcode API key / refresh token. Read from env (`ATOMBERG_API_KEY`, `ATOMBERG_REFRESH_TOKEN`) — only needed in the no-hub mode; in the default architecture these live in Home Assistant, not the app.
- Cache the access token in memory; refresh on `401`.
- Debounce UI actions and coalesce rapid changes to avoid `429`.
- Speed is 1–6. When mapping to/from Home Assistant's 0–100% `fan.set_percentage`, use 6 steps: `percentage = round(speed / 6 * 100)`, `speed = max(1, round(percentage / 100 * 6))`.

## Reference implementations (for Antigravity to consult)

- Home Assistant integration: <https://github.com/dasshubham762/atomberg-integration>
- Node-RED nodes: <https://github.com/sisodiakaran/node-red-contrib-atomberg>
- Homebridge plugin: <https://github.com/shadow5688/homebridge-atomberg-fan>
- Minimal JS example: <https://github.com/Guru-25/iot-fan-controller>
