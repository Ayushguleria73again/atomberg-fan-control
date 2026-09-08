# 11 — Home Assistant on Raspberry Pi (step-by-step)

Gets you from a bare Raspberry Pi to a running Home Assistant. After this, continue at [docs/04 Step 3](04-home-assistant-setup.md#step-3-add-the-atomberg-integration-via-hacs) to add the Atomberg integration.

## What you need

| Item | Recommended |
|------|-------------|
| Raspberry Pi | **Pi 5** (4GB+) or Pi 4 (4GB+). Pi 3 works but is sluggish. |
| Storage | **microSD (32GB+, A2)** to start — simplest. Or an NVMe/USB SSD for speed/reliability (SSD must be PCIe/NVMe, **not SATA**). |
| Power | Official USB-C supply (Pi 5: 27W; Pi 4: 15W). Underpowering causes weird crashes. |
| Network | **Ethernet cable to your router** for setup (strongly recommended; Wi-Fi is fiddly headless). |
| Card reader | To flash the microSD/SSD from your Mac. |
| A computer | Your Mac, to run Raspberry Pi Imager. |

> Your fans are on Wi-Fi (`Sushma_Niwas`). The Pi can be on Ethernet — as long as the Pi and the fans reach each other on the same LAN, the local broadcasts work.

## Step 1 — Flash Home Assistant OS

1. On your Mac, download **Raspberry Pi Imager**: <https://www.raspberrypi.com/software/> and install it.
2. Insert the microSD (or connect the SSD) to your Mac.
3. Open Raspberry Pi Imager:
   - **CHOOSE DEVICE** → your model (e.g. *Raspberry Pi 5*).
   - **CHOOSE OS** → *Other specific-purpose OS* → *Home assistants and home automation* → *Home Assistant* → pick the image matching your board (e.g. **Home Assistant OS RPi 5** / RPi 4).
   - **CHOOSE STORAGE** → select your microSD/SSD. ⚠️ double-check you picked the right drive — it gets erased.
   - **WRITE** → confirm → wait a few minutes. Skip the "edit settings" OS-customization prompt (HAOS doesn't use it).
4. When done, eject the card/SSD from the Mac.

## Step 2 — Boot the Pi

1. Put the microSD in the Pi (or connect the SSD).
2. Plug in **Ethernet** to your router.
3. Plug in **power**. The Pi boots and sets itself up.
4. **First boot takes up to ~20 minutes** — it downloads the latest Home Assistant. Be patient; don't unplug it.

## Step 3 — Open the Home Assistant UI

1. On your Mac (same network), open a browser to:
   ```
   http://homeassistant.local:8123
   ```
   - If that doesn't resolve, find the Pi's IP in your router's admin page (or your router app) and use `http://<pi-ip>:8123`.
2. You'll see "Preparing Home Assistant" — wait until it finishes (it may take a few more minutes on first run).

## Step 4 — Onboarding (create your account)

1. Click **Create my smart home**.
2. Create your **admin user** (name, username, strong password). This is your HA login — save it in your password manager.
3. Set your location (used for timezones/automations), confirm units.
4. HA may auto-discover some devices — you can skip; we add Atomberg via HACS next.
5. You land on the **Overview** dashboard. Home Assistant is now running. 🎉

## Step 5 — Update & note the address

1. **Settings → System → Updates** — install any HA update offered, then let it reboot.
2. Note how you reach HA:
   - Local: `http://homeassistant.local:8123` or `http://<pi-ip>:8123`.
   - Consider giving the Pi a **static IP / DHCP reservation** in your router so the address never changes.

## What's next

Now do these in order (all in [docs/04](04-home-assistant-setup.md)):

1. **[Add the Atomberg integration via HACS](04-home-assistant-setup.md#step-3-add-the-atomberg-integration-via-hacs)** — install HACS, add the Atomberg repo, enter your **API Key + Refresh Token** (already in your `.env.local`). Your 4 fans ([docs/10](10-your-devices.md)) appear as `fan.*` entities.
2. **[Create a long-lived access token](04-home-assistant-setup.md#step-4-create-a-long-lived-access-token-for-the-app)** for the web app → put it in `.env.local` as `HA_TOKEN`.
3. **[Set up remote access](04-home-assistant-setup.md#step-5-remote-access)** (Nabu Casa or Cloudflare Tunnel) → that HTTPS URL becomes `HA_BASE_URL`.

Then hand the repo to Antigravity ([HOW-TO-USE-WITH-ANTIGRAVITY.md](../HOW-TO-USE-WITH-ANTIGRAVITY.md)) and it builds the app.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `homeassistant.local` won't load | Use the Pi's IP (`http://<ip>:8123`). Give it a few more minutes on first boot. |
| Random reboots / instability | Underpowered supply or a cheap SD card — use the official PSU and an A2-rated card or an SSD. |
| Can't find the Pi's IP | Check your router's connected-devices list; look for "homeassistant". |
| Fans don't appear after HACS setup | Confirm the Pi and fans are on the same LAN; re-check API key/refresh token; the fan account must match the credentials. |
| First boot seems stuck | It's downloading a large image — wait the full 20 min before troubleshooting. |
