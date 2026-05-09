# SwadKart Deployment Guide

## Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     DEPLOYMENT ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   GitHub Repository                                                 │
│   └── main branch → GitHub Actions CI/CD                           │
│                                                                     │
│   ┌──────────────────────────────────────────────────────────┐      │
│   │               FRONTEND (Vercel)                          │      │
│   │   swadkart.vercel.app                                    │      │
│   │   ├── React 19 + Vite 7                                  │      │
│   │   ├── PWA (service worker + manifest)                     │      │
│   │   ├── Edge CDN + HTTPS                                   │      │
│   │   └── Auto-deploy on push to main                        │      │
│   └──────────────────────────────────────────────────────────┘      │
│                              │                                     │
│                              │ CORS/API calls                      │
│                              ▼                                     │
│   ┌──────────────────────────────────────────────────────────┐      │
│   │               BACKEND (Render)                            │      │
│   │   https://swadkart-backend.onrender.com                  │      │
│   │   ├── Node.js + Express 5                                │      │
│   │   ├── Socket.io (WebSocket)                              │      │
│   │   ├── BullMQ worker (email queue)                        │      │
│   │   └── Auto-sleep after 15min idle                        │      │
│   └──────────────────────────────────────────────────────────┘      │
│                              │                                     │
│          ┌───────────────────┼───────────────────┐                 │
│          ▼                   ▼                   ▼                 │
│   ┌────────────┐     ┌─────────────┐     ┌──────────────┐          │
│   │ MongoDB    │     │   Redis     │     │ Cloudinary  │          │
│   │ Atlas      │     │   Cloud     │     │   CDN       │          │
│   │ (Database) │     │  (Cache)    │     │ (Images)    │          │
│   └────────────┘     └─────────────┘     └──────────────┘          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Environment Variables

### Backend (.env)

Create `backend/.env` with these variables:

```env
# ========== REQUIRED ==========
NODE_ENV=production
PORT=8000
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long-here

# Database
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/swadkart?retryWrites=true&w=majority

# CORS - Your frontend URL
FRONTEND_URL=https://your-frontend-url.vercel.app

# ========== PAYMENTS ==========
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx

# ========== CLOUDINARY ==========
CLOUDINARY_CLOUD_NAME=xxxxxxxxxxxx
CLOUDINARY_API_KEY=xxxxxxxxxxxxxxxxxxxx
CLOUDINARY_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ========== OPTIONAL ==========
# Redis (optional - falls back to in-memory)
REDIS_URL=redis://default:xxxxxxxx@redis-cloud-endpoint:port

# Firebase (optional)
FIREBASE_PROJECT_ID=swadkart
GOOGLE_APPLICATION_CREDENTIALS=./firebase-admin-key.json

# Email
BREVO_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxx
SMTP_MAIL=admin@swadkart.com

# AI
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Frontend (.env)

Create `frontend/.env` or configure in Vercel:

```env
VITE_API_URL=https://your-backend-url.onrender.com/api/v1
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

---

## Step 2: Backend Deployment (Render)

### 2.1 Create Render Account
1. Go to [render.com](https://render.com)
2. Connect GitHub repository
3. Create **Web Service**

### 2.2 Configure Backend Service

| Setting | Value |
|---------|-------|
| **Root Directory** | `backend` |
| **Runtime** | `Node` |
| **Build Command** | (empty - no build step for Node) |
| **Start Command** | `npm start` |
| **Plan** | `Free` or `Starter` |

### 2.3 Environment Variables (Render Dashboard)

Add all variables from `backend/.env` in Render's Environment Variables section.

> **Important:** Set `NODE_ENV=production` in Render dashboard, not in .env file (keep .env for local development).

### 2.4 Health Check

The backend exposes `/health` endpoint which Render can use:
```
https://swadkart-backend.onrender.com/health
```

---

## Step 3: Frontend Deployment (Vercel)

### 3.1 Create Vercel Project

1. Go to [vercel.com](https://vercel.com)
2. Import GitHub repository
3. Set **Root Directory** to `frontend`
4. Framework: `Vite`

### 3.2 Environment Variables (Vercel Dashboard)

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://swadkart-backend.onrender.com/api/v1` |

### 3.3 Build Settings

| Setting | Value |
|---------|-------|
| Build Command | `npm run build` |
| Output Directory | `dist` |

### 3.4 Install Command
```
npm install
```

### 3.5 Vercel Configuration (vercel.json)

The `frontend/vercel.json` already exists:
```json
{
  "rewrites": [
    { "source": "/api/v1/:path*", "destination": "https://swadkart-backend.onrender.com/api/v1/:path*" }
  ],
  "headers": [
    {
      "source": "/sw.js",
      "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
    }
  ]
}
```

---

## Step 4: MongoDB Atlas Setup

### 4.1 Create Cluster
1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create free cluster (M0 Sandbox)
3. Choose region closest to your users (Mumbai for India)

### 4.2 Create Database User
1. Security → Database Access → Add New User
2. Grant `Read and write to any database`
3. Save password (needed for MONGO_URI)

### 4.3 Network Access
1. Security → Network Access → Add IP Address
2. Add `0.0.0.0/0` (allow all IPs for development)
3. For production, add specific Vercel/Render IP ranges

### 4.4 Get Connection String
1. Clusters → Connect → Connect your application
2. Copy connection string
3. Replace `<password>` with your database user password

```
mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/swadkart?retryWrites=true&w=majority
```

---

## Step 5: Cloudinary Setup

1. Go to [cloudinary.com](https://cloudinary.com)
2. Create free account
3. Dashboard → Copy credentials:
   - Cloud Name
   - API Key
   - API Secret

Add to backend `.env`:
```env
CLOUDINARY_CLOUD_NAME=xxxxxxxxxx
CLOUDINARY_API_KEY=xxxxxxxxxxxxxxxx
CLOUDINARY_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Step 6: Razorpay Setup

### 6.1 Create Razorpay Account
1. Go to [razorpay.com](https://razorpay.com)
2. Create test account first
3. Get API Key ID and Secret from Dashboard → Settings → API Keys

### 6.2 Webhook Setup (Production)
1. Dashboard → Settings → Webhooks
2. Add endpoint: `https://swadkart-backend.onrender.com/api/v1/payment/webhook`
3. Events: `payment.success`, `payment.failed`

### 6.3 Environment Variables
```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx
```

> **Note:** Change `rzp_test_` to `rzp_live_` for production!

---

## Step 7: PWA Installation

### For End Users

#### Android (Chrome)
1. Visit `https://swadkart.vercel.app`
2. Tap "Install" in the banner or Chrome menu (⋮) → "Add to Home Screen"

#### iOS (Safari)
1. Visit `https://swadkart.vercel.app`
2. Tap Share button → "Add to Home Screen"

#### Desktop (Chrome)
1. Visit `https://swadkart.vercel.app`
2. Click install icon in address bar (left side)

### PWA Features Working
- ✅ Offline browsing (cached pages)
- ✅ Background sync (orders queue when offline)
- ✅ Push notifications
- ✅ App-like experience (standalone)
- ✅ Dark mode support
- ✅ Home screen icon

---

## Step 8: CI/CD (GitHub Actions)

The repo includes `.github/workflows/ci.yml`:

```yaml
name: CI
on: [push, pull_request]
jobs:
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install dependencies
        run: cd frontend && npm ci
      - name: Lint
        run: cd frontend && npm run lint
      - name: Build
        run: cd frontend && npm run build

  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install dependencies
        run: cd backend && npm ci
      - name: Syntax check
        run: cd backend && node --check server.js
```

---

## Step 9: Custom Domain (Optional)

### Vercel (Frontend)
1. Project Settings → Domains
2. Add `swadkart.com`
3. Configure DNS (CNAME to Vercel)

### Render (Backend)
1. Service Settings → Custom Domain
2. Add `api.swadkart.com`
3. Point CNAME to Render endpoint

---

## Step 10: Production Checklist

### Before Going Live

- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` is 32+ characters random string
- [ ] All environment variables set in Render/Vercel dashboard
- [ ] MongoDB Atlas IP whitelist includes Render/Vercel IPs
- [ ] Razorpay uses `rzp_live_` keys (not test)
- [ ] `FRONTEND_URL` points to production frontend
- [ ] CORS whitelist updated with production domains
- [ ] HTTPS enabled on all services
- [ ] Rate limiting configured
- [ ] Health check endpoint returning 200
- [ ] PWA manifest correct (name, icons, theme color)
- [ ] Service worker caching configured
- [ ] Backup/rotate MongoDB Atlas cluster
- [ ] Monitor logs in Render dashboard
- [ ] Set up error tracking (Sentry optional)

### Security Checklist

- [ ] No localhost URLs in production
- [ ] `.env` files NOT committed to Git
- [ ] `.gitignore` includes `.env`
- [ ] Admin routes protected with `authorizeRoles`
- [ ] WebAuthn keys use HTTPS (required for biometric)
- [ ] CORS whitelist is explicit (no wildcards)
- [ ] CSRF protection enabled
- [ ] Rate limiting on auth endpoints
- [ ] Webhook signature verification (Razorpay)
- [ ] No hardcoded secrets in code
- [ ] Passwords hashed with bcrypt (already done)
- [ ] SQL/NoSQL injection prevention active

---

## Rollback Strategy

If deployment breaks:

1. **Frontend**: Vercel dashboard → Deployments → Previous deployment → "Promote to Production"
2. **Backend**: Render → Services → Backend → "Last Successful Deploy" → "Deploy"
3. **Database**: MongoDB Atlas → Clusters → Snapshots → Restore

---

## Monitoring & Alerts

### Backend Health
```bash
curl https://swadkart-backend.onrender.com/health
```
Expected response:
```json
{
  "status": "healthy",
  "services": {
    "mongo": "connected",
    "redis": "connected"
  },
  "timestamp": "2026-05-09T..."
}
```

### Render Logs
Check Render dashboard for:
- Error logs (red)
- Response times
- Memory/CPU usage
- Instance count

### Vercel Analytics
- Bandwidth usage
- Build times
- Error rates
- Function invocations

---

## Local Development Setup

```bash
# Clone repo
git clone https://github.com/yourusername/theunstopable-swadkart-pro.git
cd theunstopable-swadkart-pro

# Backend
cd backend
cp .env.example .env  # Fill in your values
npm install
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`
Backend runs at `http://localhost:8000`

---

## Troubleshooting

### "Cannot connect to database"
- Check MONGO_URI format (must include password)
- Check MongoDB Atlas IP whitelist
- Check network connectivity

### "CORS error in production"
- Verify FRONTEND_URL in backend .env matches exact Vercel URL
- Check no trailing slashes

### "Payment webhook not working"
- Razorpay webhook must use raw body (server.js handles this)
- Check webhook is registered in Razorpay dashboard

### "Images not loading"
- Verify Cloudinary credentials
- Check CLOUDINARY_URL format

### "PWA not installing"
- Service worker must be served over HTTPS
- manifest.json must be accessible
- Icons must be at least 192x192 and 512x512 PNG

### "Socket.io connection fails"
- Check CORS whitelist includes frontend URL
- Check Socket.io auth token is valid
- Check backend is not in idle sleep (use ping keep-alive)