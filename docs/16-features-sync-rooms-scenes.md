# 16 — Features: Device Sync + Rooms/Groups + Scenes

Two feature sets, both fully cloud-native (no Bluetooth/WiFi scanning — see the note at the end). Build on the multi-tenant app with the `webapp-conventions`, `multitenant-byok`, and `ui-design` skills. All new state is **per-user in Neon Postgres**; keep the Atomberg quota discipline (~100 calls/day).

---

## Feature A — Device Sync & auto-detect new fans

**Goal:** when the user adds a fan in the Atomberg Home app, they can pull it into FanControl without re-connecting.

### How it works
The user's fans live on their Atomberg account. `GET /v1/get_list_of_devices` returns the current list. We persist a per-user snapshot and **diff** on demand.

### Data model (new table)
```
user_devices
  user_id (fk)          -- owner
  device_id             -- Atomberg id (pk with user_id)
  name                  -- from Atomberg (editable override below)
  custom_name           -- optional user rename (voice-friendly)
  room                  -- from Atomberg
  series, model
  first_seen_at
  last_seen_at
  hidden (bool)         -- user hid it from the dashboard
  is_new (bool)         -- surfaced until acknowledged
  PRIMARY KEY (user_id, device_id)
```

### API
- `POST /api/devices/sync` — auth required. Calls `get_list_of_devices` (1 Atomberg call), upserts rows, marks `is_new=true` for ids not seen before, marks `last_seen_at`; flags devices missing from the list as offline/removed (don't hard-delete — the fan may be temporarily off the account). Returns `{ added:[], removed:[], total }`.
- `PATCH /api/devices/:id` — set `custom_name`, `hidden`, or acknowledge `is_new=false`.

### UX (Apple-minimal, mobile-first)
- A **"Sync"** action in the header/settings (not auto-polled — it costs 1 quota call). Spinner → toast: *"2 new fans found: Balcony 2, Study"* or *"You're up to date."*
- New fans show a subtle **"New"** pill until tapped/acknowledged.
- Let users **rename** a fan (`custom_name`) — important because Atomberg's names are messy (you have two "Hall" fans). The rename feeds the voice alias map too ([docs/10](10-your-devices.md)).
- Let users **hide** a fan they don't want on the dashboard.

### Quota
`get_list_of_devices` = 1 call. Only on explicit Sync (and once right after Connect). Never on every dashboard load — read fan **state** from the cached `get_device_state?device_id=all` as today.

---

## Feature B — Rooms / Groups & Scenes

**Goal:** organize fans and control several at once.

### Groups (rooms)
Atomberg returns a `room` per device, but users need their own tidy grouping. Store custom groups per user.

```
groups
  id (pk)
  user_id (fk)
  name                  -- "Bedroom", "Upstairs"
  device_ids (json/array of device_id)
  sort_order
```

- **API:** `GET/POST/PATCH/DELETE /api/groups` (auth + ownership: every device_id must belong to the caller).
- **UX:** dashboard sections by group with a collapsible header; a group header has **group actions** (All On / All Off, and a group speed). Default groups seeded from Atomberg `room` on first load; fully editable. Drag-to-reorder is a nice-to-have, not required for v1.

### Scenes
A named snapshot of desired states across multiple fans — e.g. **"Movie"** = Living Room speed 2, Bedroom off; **"Sleep"** = all speed 1 + sleep mode on.

```
scenes
  id (pk)
  user_id (fk)
  name, icon
  actions (json)        -- [{ device_id, power?, speed?, led?, sleep?, timer? }, ...]
  sort_order
```

- **API:** `GET/POST/PATCH/DELETE /api/scenes`; `POST /api/scenes/:id/activate` → dispatches each action through the **existing** `/api/fans/:id/cmd` path (ownership-checked), with optimistic UI.
- **"Save current as scene"**: capture the live state of selected fans into a new scene.
- **UX:** a compact scenes row near the top (pill buttons with an icon + name); tap to activate; long-press/edit to modify. Keep it minimal per the design system.

### Quota (important)
Activating a scene or a group action sends **one Atomberg command per affected fan**. A 4-fan "all off" = 4 calls. That's fine for occasional use, but:
- **Debounce/coalesce**: if a fan already has the target state, skip its command (saves calls).
- Warn/disable rapid repeat activations.
- Count group/scene dispatches against the per-user daily budget; surface Atomberg 429s gracefully.

---

## Design & security notes
- All new UI follows [docs/15](15-design-system.md) — Apple-minimal, mobile-first, light+dark. Group headers and scene pills stay quiet; one accent color.
- Every new route is **auth-required** and **ownership-checked**: a user can only sync/group/scene **their own** device IDs ([docs/14](14-credential-security.md)). Never trust a device_id from the client without verifying it's in the caller's `user_devices`.
- No new secrets; no new external services.

## Why not Bluetooth/WiFi discovery here
Adding fans this way is intentionally via the **Atomberg cloud device list**, not local scanning:
- A hosted web page **cannot** scan the LAN / do mDNS (browser sandbox) — true local WiFi discovery needs the **Home Assistant hub** ([docs/04](04-home-assistant-setup.md)) or a native app.
- **Web Bluetooth** is unsupported on iOS Safari and Atomberg's BLE isn't documented — not viable for a mobile-first cross-platform app.
The cloud sync above gives the same outcome ("see my new fans") on every device. Record local discovery as a Home-Assistant-hub future item, not a web-app feature.
