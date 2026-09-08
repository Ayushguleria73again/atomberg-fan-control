# 10 — Your Devices (live-verified)

Captured from a live `get_list_of_devices` + `get_device_state` call on 2026-09-08. These are **your** fans. Antigravity: use these device IDs and the confirmed state schema below.

## Your fans

| device_id | Fan name (from app) | Room (from app) | Model | Series |
|-----------|--------------------|-----------------|-------|--------|
| `3844be6b7c80` | hall Fan one | Hall fan1 | renesa+ | R2 |
| `3844be560e10` | branda fan | Balcony | renesa+ | R2 |
| `3844be54dfa4` | Hall Fan | Hall Fan1 | renesa+ | R2 |
| `8cfd495a1730` | master bedroom fan | Living Room | renesa+ | R2 |

All four are Wi-Fi (`renesa+`, R2) on SSID `Sushma_Niwas` and were online.

> **Heads-up on names:** the app labels are a bit inconsistent — e.g. `master bedroom fan` sits in room `Living Room`, and there are two "Hall" fans. You'll want clean, unambiguous names for voice control. Fix them in the **Atomberg Home app** (rename each fan/room) so Home Assistant picks up tidy names, OR override them in the app's alias map (see below). Voice can't reliably tell apart two fans both called "Hall".

## Confirmed state schema (R2 / renesa+)

`get_device_state` returns, per device:

```json
{
  "device_id": "3844be6b7c80",
  "power": true,
  "last_recorded_speed": 6,      // 1..6
  "sleep_mode": false,
  "led": true,                   // this model HAS an LED underlight
  "is_online": true,
  "timer_hours": 0,              // 0 = no timer; supports off-timer
  "timer_time_elapsed_mins": 0,
  "ts_epoch_seconds": 1788852848
}
```

**What this confirms for your build:**
- ✅ `power` (on/off), `speed` (1–6), `led` (underlight), `sleep_mode`, and a `timer` are all real on your fans — build UI + voice for all of them.
- Map app/HA fields: `online = is_online`, `power = power`, `speed = last_recorded_speed`, `led = led`, `sleep = sleep_mode`, `timer = timer_hours`.

## Command key names — still to confirm

`send_command` verified keys are `power`, `speed`, `led`. The **command** key names for sleep and timer may differ from the **state** field names (`sleep_mode`, `timer_hours`). Before wiring those buttons, Antigravity should test one command against a fan and read the state back, e.g.:

```bash
# try sleep on, then read state to see if sleep_mode flips
POST /v1/send_command  { "device_id": "3844be6b7c80", "command": { "sleep": true } }
# if that doesn't work, try "sleep_mode": true
```
Do the same to learn the `timer` command's value mapping (which number = how many hours). In the **default architecture you won't need this** — Home Assistant exposes sleep/timer as preset modes and handles the key names for you.

## Suggested voice alias map (starting point)

Once you rename the fans sensibly, seed `lib/intents.ts` with something like:

```ts
const aliases: Record<string, string[]> = {
  "3844be6b7c80": ["hall one", "first hall", "hall fan one"],
  "3844be54dfa4": ["hall two", "second hall", "hall fan"],
  "3844be560e10": ["balcony", "veranda", "branda"],
  "8cfd495a1730": ["bedroom", "master bedroom", "living room"], // pick ONE, then rename in app to match
};
```

> In the Home-Assistant build these map to `fan.*` entity IDs instead of raw device IDs — grab the entity IDs after adding the Atomberg integration ([docs/04](04-home-assistant-setup.md#step-3)).

## Quota reminder
These reads each cost 1 of your **~100 API calls/day**. Don't poll — read state via Home Assistant's local broadcasts. See [docs/03](03-atomberg-api.md#️-rate-limits-design-critical).
