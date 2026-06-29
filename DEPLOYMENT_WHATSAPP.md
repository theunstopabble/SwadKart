# WhatsApp Integration — Setup & Deployment Guide

## Architecture Overview

```
WhatsApp User ←→ OpenWA (NestJS, port 2785) ←→ SwadKart Backend (Express, port 8000)
                        ↕ (webhooks)
                  SwadKart Webhook Handler
                        ↕
                  Chatbot / Support / Order Notes
```

- **OpenWA**: Self-hosted WhatsApp API gateway (separate Docker container)
- **SwadKart Backend**: REST API client + webhook handler

---

## Step 1 — OpenWA API Key Generation

```bash
cd backend
node scripts/generate-openwa-key.js
```

This prints:
- An `owa_k1_...` API key
- A webhook HMAC secret
- Ready-to-paste `.env` lines

Copy both values to your `.env` file.

---

## Step 2 — Deploy OpenWA (Render)

### Option A: Render Blueprint (Recommended)

1. Go to https://dashboard.render.com/blueprints
2. Connect your GitHub repo
3. Render auto-detects `render.yaml` (if you create one) or use Docker

Create `render-openwa.yaml` in repo root:
```yaml
services:
  - type: web
    name: openwa-api
    env: docker
    dockerfilePath: ./Dockerfile
    repo: https://github.com/YOUR_USERNAME/OpenWA
    branch: main
    envVars:
      - key: API_KEY
        sync: false  # set manually
      - key: WEBHOOK_SECRET
        sync: false
      - key: ENGINE_TYPE
        value: baileys
      - key: NODE_ENV
        value: production
```

### Option B: Render Docker (Manual)

1. Dashboard → New → Web Service
2. **Not available** — use External Docker image
3. Instead, deploy via Render's Docker runtime:

```
Name: openwa-api
Runtime: Docker
Repository: ghcr.io/rmyndharis/openwa:latest
Port: 2785
Health Check Path: /api/sessions/stats/overview
```

4. Add env vars:
   - `API_KEY` = from Step 1
   - `WEBHOOK_SECRET` = from Step 1
   - `ENGINE_TYPE` = `baileys`
   - `NODE_ENV` = `production`

5. **Prevent cold sleep** (Render free tier sleeps after 15min):
   - Use cron-job.org or UptimeRobot to ping `https://openwa.onrender.com/api/sessions/stats/overview` every 10 minutes
   - Or set `Health Check Path: /api/sessions/stats/overview` (Render keeps it warm)

### Option C: Local Docker

```bash
# Default (SQLite)
docker compose -f docker-compose.openwa.yml up -d

# Production (PostgreSQL)
docker compose -f docker-compose.openwa.yml --profile postgres up -d

# Full stack (PostgreSQL + Redis + MinIO)
docker compose -f docker-compose.openwa.yml --profile full up -d
```

---

## Step 3 — Get QR Code & Link WhatsApp

Once OpenWA is running:

```bash
# Create a session
curl -X POST https://openwa.onrender.com/api/sessions \
  -H "X-API-Key: owa_k1_..." \
  -H "Content-Type: application/json" \
  -d '{"name": "swadkart-bot"}'

# Start the session (get session ID from response)
curl -X POST https://openwa.onrender.com/api/sessions/{SESSION_ID}/start \
  -H "X-API-Key: owa_k1_..."

# Get QR code
curl https://openwa.onrender.com/api/sessions/{SESSION_ID}/qr \
  -H "X-API-Key: owa_k1_..."
```

Open the QR URL in a browser, scan with WhatsApp → **Linked!**

**Alternative — Pairing Code** (no QR scan needed):
```bash
curl -X POST https://openwa.onrender.com/api/sessions/{SESSION_ID}/pairing-code \
  -H "X-API-Key: owa_k1_..." \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "919876543210"}'
```

---

## Step 4 — Configure OpenWA Webhook (OpenWA → SwadKart)

Tell OpenWA where to send incoming messages:

```bash
curl -X POST https://openwa.onrender.com/api/sessions/{SESSION_ID}/webhooks \
  -H "X-API-Key: owa_k1_..." \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://swadkart-api.onrender.com/api/v1/whatsapp/webhook",
    "events": ["message.received", "session.status", "message.ack"],
    "secret": "your-hmac-secret-from-step-1"
  }'
```

---

## Step 5 — Configure SwadKart .env

Add to `backend/.env`:

```env
# OpenWA
OPENWA_BASE_URL=https://openwa.onrender.com
OPENWA_API_KEY=owa_k1_generated_key
OPENWA_WEBHOOK_SECRET=your_hmac_secret
OPENWA_TIMEOUT_MS=15000
OPENWA_MAX_RETRIES=2
OPENWA_DEFAULT_SESSION=default
OPENWA_ISOLATE_SESSIONS=true
OPENWA_RATE_LIMIT=60
OPENWA_ENGINE_TYPE=baileys
```

---

## Step 6 — Verify Everything

```bash
# Check OpenWA is alive
curl https://openwa.onrender.com/api/sessions/stats/overview -H "X-API-Key: owa_k1_..."

# Check SwadKart WhatsApp health
curl https://swadkart-api.onrender.com/api/v1/whatsapp/health

# Check metrics
curl https://swadkart-api.onrender.com/api/v1/whatsapp/metrics

# Send a test message via OpenWA
curl -X POST https://openwa.onrender.com/api/sessions/{SESSION_ID}/messages/send-text \
  -H "X-API-Key: owa_k1_..." \
  -H "Content-Type: application/json" \
  -d '{"chatId": "919876543210@c.us", "text": "Hello from SwadKart! 🎉"}'
```

---

## Step 7 — User Opt-In Flow

WhatsApp notifications are **opt-in only** (all default to `false`):

1. User logs into SwadKart app
2. Goes to **Settings → Notifications**
3. Toggles: `whatsappNotifications.orders`, `.promotions`, `.otp`
4. Backend stores preference in `User.whatsappNotifications`

**API to update preferences:**
```http
PATCH /api/v1/users/profile
Content-Type: application/json
Authorization: Bearer <jwt>

{
  "whatsappNotifications": {
    "orders": true,
    "promotions": false,
    "otp": true
  }
}
```

---

## Step 8 — Monitoring

| Endpoint | What it shows |
|----------|---------------|
| `GET /api/v1/whatsapp/health` | OpenWA connectivity + active sessions |
| `GET /api/v1/whatsapp/metrics` | 24h/1h send counts by status & type |
| `WhatsAppLog` collection | Every sent/received message in MongoDB |

**Retry Queue**: Runs automatically in background every 30s. Failed messages get 3 retry attempts then marked as `cancelled`.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| OpenWA container crashes | Check `API_KEY` is set; use `ENGINE_TYPE=baileys` (more stable) |
| QR code won't scan | Use pairing code instead (`POST /pairing-code`) |
| Webhook not firing | Verify `events` array includes `message.received`; check webhook URL is public |
| HMAC signature mismatch | Ensure `OPENWA_WEBHOOK_SECRET` matches the secret used in webhook setup |
| "OpenWA not configured" error | Set `OPENWA_BASE_URL` and `OPENWA_API_KEY` in `.env` |
| WhatsApp number banned | Use a secondary number; don't send bulk without opt-in |
| Cold sleep on Render free tier | Set up cron-job.org to ping every 10 min |
| API key format warning | Generate a new key with `node scripts/generate-openwa-key.js` |
