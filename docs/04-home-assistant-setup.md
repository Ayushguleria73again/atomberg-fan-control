# 04 — Home Assistant Setup (human steps)

These are the physical/account steps only you can do. Once done, Antigravity wires the app to Home Assistant. Do them in order.

---

## Step 1 — Get your Atomberg developer credentials

1. Open the **Atomberg Home** app.
2. Profile / Settings → enable **Developer Options**.
3. Copy the **API Key** and **Refresh Token**. Keep them somewhere safe (a password manager) — you'll paste them into Home Assistant, not into the app or git.
4. Reference: <https://developer.atomberg-iot.com/#overview>

---

## Step 2 — Install Home Assistant

Pick whatever's easiest for you; all give the same result.

| Option | Best if | How |
|--------|---------|-----|
| **Home Assistant Green / Yellow** | You want plug-and-play hardware | Buy the box, plug in, follow onboarding |
| **Raspberry Pi (HA OS)** | You have a spare Pi 4/5 | Flash HA OS with Raspberry Pi Imager, boot, open `http://homeassistant.local:8123` |
| **Old laptop / mini-PC (HA OS)** | You have an always-on machine | Install HA OS or run the VM image |
| **Docker** | You already run Docker on a NAS/server | `ghcr.io/home-assistant/home-assistant:stable`, expose port 8123 |

Requirements for the Atomberg integration's IR fallback: **Home Assistant 2026.4.0 or newer** (cloud-only control has no version floor, but stay current). Finish HA onboarding (create your admin user) before continuing.

---

## Step 3 — Add the Atomberg integration (via HACS)

The community Atomberg integration gives cloud control with two-way state (and optional IR).

1. **Install HACS** (Home Assistant Community Store) if you don't have it: <https://hacs.xyz/> → follow the install guide, then restart HA and add the HACS integration.
2. In HA: **HACS → Integrations → ⋮ menu → Custom repositories** → add
   `https://github.com/dasshubham762/atomberg-integration` (category: *Integration*).
   *(Or just search "Atomberg" in HACS if it's already indexed.)*
3. Install it, then **restart Home Assistant**.
4. **Settings → Devices & Services → Add Integration → Atomberg.**
5. Choose **Cloud API** control and paste your **API Key** and **Refresh Token** from Step 1.
6. Your fans appear as `fan.<room_name>` entities. Check **Settings → Devices & Services → Entities** and note the exact entity IDs (e.g. `fan.living_room`, `fan.bedroom`) — Antigravity needs these.

> Optional IR backup: if you have an IR blaster and want local control when the cloud is down, add the IR option too (needs HA 2026.4+). Not required for v1.

Verify it works: open a fan entity in HA and toggle it — the real fan should respond.

---

## Step 4 — Create a long-lived access token (for the app)

The web app authenticates to HA with a token, not your password.

1. In HA, click your **user profile** (bottom-left).
2. Scroll to **Long-Lived Access Tokens → Create Token.**
3. Name it `fancontrol-app`, copy the token **immediately** (shown once).
4. This is your `HA_TOKEN`. It goes in the app's server-side env, never the browser. See [07-security.md](07-security.md).

---

## Step 5 — Remote access (so the app works outside your Wi-Fi)

The app's **server** needs to reach Home Assistant. Two good options:

| Option | Cost | Setup | Gives you |
|--------|------|-------|-----------|
| **Nabu Casa (Home Assistant Cloud)** | ~$6.50/mo | Settings → Home Assistant Cloud → turn on | A stable `https://<id>.ui.nabu.casa` URL, zero networking |
| **Cloudflare Tunnel** | Free | Run `cloudflared` pointing at `localhost:8123`, map a hostname | `https://ha.yourdomain.com`, no open ports |

Either way you end up with an **HTTPS base URL for Home Assistant**. That URL + the token from Step 4 are the two values the app's server needs:

```
HA_BASE_URL = https://<your-ha-url>
HA_TOKEN    = <long-lived token>
```

> Don't expose HA by port-forwarding raw 8123 to the internet. Use Nabu Casa or a tunnel.

---

## What to hand Antigravity after this

Give Antigravity (in `.env.local`, not chat):

- `HA_BASE_URL` — from Step 5
- `HA_TOKEN` — from Step 4
- The list of fan entity IDs from Step 3 (e.g. `fan.living_room`, `fan.bedroom`) and the friendly names you want to say by voice.

Antigravity handles the rest.
