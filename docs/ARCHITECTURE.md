# SwadKart Architecture

## High-Level System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SWADKART FLOW                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                  │
│   │   BROWSER    │────▶│    CDN/WAF   │────▶│  VITE PWA    │                  │
│   │   (PWA)      │     │  (Vercel)    │     │  (React)     │                  │
│   └──────────────┘     └──────────────┘     └──────┬───────┘                  │
│                                                    │                          │
│                     ┌──────────────────────────────┴──────┐                   │
│                     │           REDUX STORE                │                   │
│                     │  (userSlice + cartSlice + RTK)      │                   │
│                     └──────────────────────────────┬──────┘                   │
│                                                    │                          │
│                          ┌────────────────────────┴──────────────────┐        │
│                          │              LAYER 2: API GATEWAY         │        │
│                          │                                              │        │
│                          │  Socket.io (real-time) ◄──► REST API        │        │
│                          │  JWT Auth ◄──► Rate Limiter ◄──► Helmet   │        │
│                          └──────────────────────┬──────────────────┘        │
│                                                  │                          │
│   ┌──────────────┐     ┌────────────────────────┴──────┐                   │
│   │  CLOUDINARY  │◄────│         LAYER 3: BACKEND       │                   │
│   │  (CDN/Img)   │     │       (Node/Express/Render)     │                   │
│   └──────────────┘     │                                 │                   │
│                        │  Controllers (30+)             │                   │
│   ┌──────────────┐     │  ├── authController             │                   │
│   │  RAZORPAY    │◄────│  ├── orderController            │                   │
│   │  (Payments)  │     │  ├── paymentController          │                   │
│   └──────────────┘     │  ├── restaurantController       │                   │
│                        │  ├── biometricController        │                   │
│   ┌──────────────┐     │  ├── deliveryController         │                   │
│   │  FIREBASE    │◄────│  ├── analyticsController       │                   │
│   │  (Push/FCM)  │     │  └── ... (24 more)             │                   │
│   └──────────────┘     │                                 │                   │
│                        │  Middleware                      │                   │
│   ┌──────────────┐     │  ├── authMiddleware (JWT/Cook) │                   │
│   │  BREVO/SMTP  │◄────│  ├── cacheMiddleware (Redis)   │                   │
│   │  (Email)     │     │  ├── fraudDetection            │                   │
│   └──────────────┘     │  └── validationMiddleware       │                   │
│                        └────────────────────┬───────────┘                   │
│                                             │                              │
│                     ┌───────────────────────┴─────────────────┐             │
│                     │          LAYER 4: DATA                 │             │
│                     │                                        │             │
│    ┌────────┐       │  ┌──────────────────────────────────┐ │             │
│    │ Redis  │◄──────│  │          MONGODB ATLAS           │ │             │
│    │(Cache) │       │  │                                  │ │             │
│    └────────┘       │  │  Users (biometric creds)          │ │             │
│                     │  │  Restaurants (GeoJSON)           │ │             │
│                     │  │  Products (stock/schedule)       │ │             │
│                     │  │  Orders (lifecycle)               │ │             │
│                     │  │  Coupons (usage tracking)        │ │             │
│                     │  │  Notifications                   │ │             │
│                     │  │  Subscriptions (SwadPass)        │ │             │
│                     │  │  GroupOrders                     │ │             │
│                     │  │  Reservations                   │ │             │
│                     │  │  Payouts                        │ │             │
│                     │  └──────────────────────────────────┘ │             │
│                     └────────────────────────────────────┘             │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Tech Stack by Layer

### Frontend (PWA)
```
Vite + React 19 + Tailwind CSS v3 + PWA (vite-plugin-pwa)
├── Redux Toolkit (state management)
├── React Router v7 (routing)
├── Socket.io-client (real-time)
├── Firebase (push notifications)
├── Google Auth (@react-oauth/google)
├── Leaflet (maps)
├── Recharts (analytics charts)
├── i18next (Hindi/English)
└── WebAuthn (@simplewebauthn/browser) — Biometric Auth
```

### Backend (API Server)
```
Node.js 22 + Express 5 + Socket.io 4
├── JWT (jsonwebtoken) + bcryptjs
├── Mongoose 9 (MongoDB ODM)
├── Redis (ioredis + cache.js)
├── BullMQ (email queue worker)
├── Multer + Cloudinary (image upload)
├── Firebase Admin (push notifications)
├── Groq SDK (AI chat/AI recommendations)
├── Razorpay SDK (payments)
├── Sharp (image processing)
├── Helmet + express-rate-limit + CORS (security)
├── Brevo/Nodemailer (transactional emails)
└── express-async-handler (error handling)
```

## API Architecture

### Base URL Structure
```
/api/v1/{resource}/{action}
```

### Middleware Pipeline
```
Request
  │
  ├─► helmet() — security headers
  ├─► compression() — gzip/brotli
  ├─► cookie-parser() — httpOnly cookies
  ├─► safeMongoSanitize() — NoSQL injection prevention
  ├─► csrfProtection() — anti-CSRF
  ├─► cors() — origin whitelist
  ├─► rateLimit() — DoS protection
  ├─► authMiddleware (JWT/Cookie) — who are you?
  ├─► roleMiddleware — what can you do?
  ├─► fraudDetectionMiddleware — suspicious?
  ├─► validationMiddleware — is data valid?
  ├─► cacheMiddleware (optional) — use Redis?
  │
  ▼
Controller (async)
  │
  ├─► Business Logic
  ├─► Database Operation (Mongoose)
  ├─► Socket.io Emit (real-time)
  ├─► Queue Email Worker (BullMQ)
  └─► Response
```

## Data Flow: User Journey

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         COMPLETE USER FLOW                                │
└──────────────────────────────────────────────────────────────────────────┘

[1] BROWSER OPEN
        │
        ▼
   PWA Install Prompt (vite-plugin-pwa manifest + service worker)
        │
        ▼
   Home Page Load (restaurants list from /api/v1/restaurants)
        │
        ▼
   JWT Cookie + HttpOnly Session (login via /api/v1/users/login)
        │
        ├──► Biometric App Lock (WebAuthn — optional second factor)
        │
        ▼
[2] BROWSE RESTAURANTS
   GET /api/v1/restaurants
   ├── Cache: 5 min (Redis/Memory)
   ├── GeoJSON index for proximity search
   └── Socket.io: shopStatusUpdated event
        │
        ▼
[3] RESTAURANT MENU
   GET /api/v1/products/restaurant/:id
   ├── Real-time stock check (isAvailable, countInStock)
   ├── AI recommendations: GET /api/v1/analytics/recommendations
   └── Schedule check (Mon-Sun availability)
        │
        ▼
[4] ADD TO CART
   Redux cartSlice (persisted in localStorage)
   ├── Variant selection (size/price)
   ├── Add-ons (extra toppings)
   └── Coupon check: GET /api/v1/coupons/available
        │
        ▼
[5] CHECKOUT / SHIPPING
   GET /api/v1/users/profile (auto-fill address)
   Geolocation API → Google Maps (Leaflet)
   Address saved to: shippingAddress in order
        │
        ▼
[6] APPLY COUPON
   POST /api/v1/coupons/validate
   ├── minOrderValue check
   ├── maxDiscountAmount cap
   └── usedBy tracking (prevent reuse)
        │
        ▼
[7] PAYMENT (Razorpay)
   POST /api/v1/payment/create → { orderId, amount, currency }
   ├── Razorpay checkout SDK (browser)
   ├── webhook: POST /api/v1/payment/webhook (signature verify)
   └── Fallback: Wallet payment (SwadKart wallet balance)
        │
        ▼
[8] ORDER CREATED
   POST /api/v1/orders
   ├── fraudDetection middleware check
   ├── Socket.io: orderCreated event
   ├── stock decrement (atomic)
   └── BullMQ email queue
        │
        ▼
[9] RESTAURANT ACCEPTS
   Restaurant Dashboard: PUT /api/v1/orders/:id/status
   Socket.io: orderUpdated → customer notified
        │
        ▼
[10] DELIVERY ASSIGNED
   Admin/Restaurant: PUT /api/v1/orders/:id/assign
   ├── deliveryOTP generated (crypto.randomInt)
   ├── Socket: orderAssigned → driver notified
   └── Push notification (Firebase FCM)
        │
        ▼
[11] DRIVER EN ROUTE
   Driver: PUT /api/v1/orders/:id/delivery-action (accept)
   Real-time: Driver location broadcast every 5s
   Socket: driverLocationUpdate → customer sees live map
        │
        ▼
[12] DELIVERY COMPLETE
   Driver: PUT /api/v1/orders/:id/deliver
   ├── OTP verification (5 attempts max)
   ├── COD marked as paid
   ├── Gamification: orderStreak updated
   ├── Referral reward processed
   └── Push: "Order Delivered!"
```

## PWA Architecture

```
┌─────────────────────────────────────────────┐
│           SERVICE WORKER (sw.js)            │
├─────────────────────────────────────────────┤
│                                             │
│  Cache Strategies:                          │
│  ├── App Shell: Cache-First (HTML/JS/CSS)   │
│  ├── API Calls: Network-First               │
│  ├── Images: Stale-While-Revalidate         │
│  └── Offline: Show cached data             │
│                                             │
│  Background Sync:                           │
│  ├── Order submission when offline          │
│  └── Notification permission request        │
│                                             │
│  Push Notifications (Firebase):             │
│  ├── Order updates                          │
│  ├── Promotions                             │
│  └── Delivery status                        │
│                                             │
└─────────────────────────────────────────────┘
```

## Security Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    SECURITY MULTI-LAYER                        │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Layer 1: Transport                                            │
│  ├── HTTPS everywhere (Vercel/Render)                         │
│  └── HSTS headers (Helmet)                                    │
│                                                                │
│  Layer 2: Authentication                                        │
│  ├── JWT token (Bearer + HttpOnly cookie fallback)            │
│  ├── 10 min rate limit on login/register/OTP                  │
│  └── Biometric WebAuthn (optional app lock)                   │
│                                                                │
│  Layer 3: Authorization                                         │
│  ├── Role-based (user, admin, restaurant_owner, delivery)     │
│  ├── Order ownership verification (SEC-5)                     │
│  └── Socket.io JWT verification on connect                    │
│                                                                │
│  Layer 4: Input Validation                                      │
│  ├── express-validator schemas                                 │
│  ├── MongoDB NoSQL injection prevention (sanitizeMiddleware) │
│  ├── Body size limit (10mb)                                   │
│  └── Email validation (deep-email-validator)                   │
│                                                                │
│  Layer 5: Rate Limiting                                        │
│  ├── 300 req/15min on /api                                    │
│  ├── 10 req/10min on auth endpoints                           │
│  ├── 20 orders/15min per user                                 │
│  └── 10 req/min on AI chat endpoint                            │
│                                                                │
│  Layer 6: CSRF Protection                                       │
│  ├── Origin/Referer check against whitelist                    │
│  └── Bearer token exempt (mobile/app clients)                 │
│                                                                │
│  Layer 7: Fraud Detection                                      │
│  ├── Order value spike detection                               │
│  ├── Rapid order frequency check                               │
│  └── Unusual IP/behavior pattern                               │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## Chatbot Action Tools Architecture

### Tool Registry & Multi-Tool Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CHATBOT ACTION TOOLS PIPELINE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  POST /api/v1/chat                                                          │
│       │                                                                      │
│       ▼                                                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      CHAT PIPELINE ORCHESTRATOR                       │   │
│  │                                                                      │   │
│  │  1. Load conversation history                                        │   │
│  │  2. Detect language (sync, pure)                                     │   │
│  │  3. Classify intent + Analyze sentiment (parallel)                   │   │
│  │  4. Retrieve products (if needed)                                    │   │
│  │  5. Build prompt with token budget                                   │   │
│  │  6. Build tools from registry (auth-conditional)  ◄─── NEW          │   │
│  │  7. Multi-tool loop (sequential tool_calls)       ◄─── NEW          │   │
│  │  8. Stream response (SSE events)                                     │   │
│  │  9. Persist messages                                                 │   │
│  │ 10. Escalation flag logic                                            │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│       │                                                                      │
│       ▼                                                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         TOOL REGISTRY                                 │   │
│  │                                                                      │   │
│  │  buildToolRegistry({ userId })                                       │   │
│  │       │                                                              │   │
│  │       ├── PUBLIC_TOOLS (always included)                             │   │
│  │       │     └── faq_support (no auth, no DB, sub-100ms)             │   │
│  │       │                                                              │   │
│  │       └── AUTH_TOOLS (only if userId is truthy)                      │   │
│  │             ├── place_order                                          │   │
│  │             ├── get_order_status                                     │   │
│  │             ├── cancel_order                                         │   │
│  │             ├── list_coupons                                         │   │
│  │             ├── get_delivery_eta                                     │   │
│  │             └── reorder_last                                         │   │
│  │                                                                      │   │
│  │  getToolExecutor(functionName) → execute function                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│       │                                                                      │
│       ▼                                                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      MULTI-TOOL LOOP                                  │   │
│  │                                                                      │   │
│  │  while (response.has_tool_calls) {                                   │   │
│  │    for each tool_call:                                               │   │
│  │      executor = getToolExecutor(name)                                │   │
│  │      result = await executor(args, { userId })                       │   │
│  │    re-call Groq LLM with accumulated results                        │   │
│  │  }                                                                   │   │
│  │  return final text response                                          │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      TOOL EXECUTION PATTERN                           │   │
│  │                                                                      │   │
│  │  Gate Pattern (per tool):                                            │   │
│  │    1. Auth gate     → reject if userId missing                       │   │
│  │    2. Existence gate → reject if resource not found                  │   │
│  │    3. Business rules → reject if constraints violated                │   │
│  │    4. Operation     → execute with timeout                           │   │
│  │                                                                      │   │
│  │  Timeouts:                                                           │   │
│  │    • Read operations: 3s                                             │   │
│  │    • Write operations: 5s                                            │   │
│  │                                                                      │   │
│  │  Atomicity:                                                          │   │
│  │    • Writes use findOneAndUpdate (atomic)                            │   │
│  │    • Transactions for multi-document writes                          │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tool File Structure

```
backend/services/chat/
├── chatPipeline.js          # Orchestrator (multi-tool loop)
├── tools/
│   ├── toolRegistry.js      # Centralized registry (auth-conditional)
│   ├── orderStatusTool.js   # get_order_status (auth, read, 3s timeout)
│   ├── orderCancelTool.js   # cancel_order (auth, write, 5s timeout, 5-min window)
│   ├── couponTool.js        # list_coupons (auth, read/write, 3s/5s timeout)
│   ├── deliveryEtaTool.js   # get_delivery_eta (auth, read, 3s timeout)
│   ├── faqTool.js           # faq_support (no auth, sync, sub-100ms)
│   └── reorderTool.js       # reorder_last (auth, write, 5s timeout)
└── orderPlacementTool.js    # place_order (existing)
```

---

## Environment Variables Reference

| Variable | Purpose | Where |
|----------|---------|-------|
| `MONGO_URI` | MongoDB Atlas connection string | Backend |
| `JWT_SECRET` | Token signing (32+ chars in prod) | Backend |
| `PORT` | Server port (default 8000) | Backend |
| `FRONTEND_URL` | CORS whitelist + emails | Backend |
| `RAZORPAY_KEY_ID` | Razorpay public key | Backend |
| `RAZORPAY_KEY_SECRET` | Razorpay secret key | Backend |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary CDN | Backend |
| `CLOUDINARY_API_KEY` | Cloudinary API | Backend |
| `CLOUDINARY_API_SECRET` | Cloudinary secret | Backend |
| `REDIS_URL` | Redis connection (optional, fallback to in-memory) | Backend |
| `FIREBASE_PROJECT_ID` | Firebase Admin SDK | Backend |
| `GOOGLE_APPLICATION_CREDENTIALS` | Firebase service account | Backend |
| `BREVO_API_KEY` | Brevo email transactional | Backend |
| `SMTP_MAIL` | Admin email for notifications | Backend |
| `GROQ_API_KEY` | AI chat/AI recommendations | Backend |
| `VITE_API_URL` | Backend API base URL | Frontend |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth | Frontend |

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         VERCEL (Frontend)                       │
│   └── swadkart.vercel.app — PWA, SSR, CDN, Edge                │
├─────────────────────────────────────────────────────────────────┤
│                         RENDER (Backend)                        │
│   └── swadkart-backend.onrender.com — API Server               │
│       └── Background worker (BullMQ email)                     │
├─────────────────────────────────────────────────────────────────┤
│                      MONGODB ATLAS (Database)                  │
│   └── mongodb+srv:// — Replica set, auto-sharding             │
├─────────────────────────────────────────────────────────────────┤
│                       REDIS CLOUD (Cache)                       │
│   └── redis:// — Optional, falls back to in-memory Map        │
├─────────────────────────────────────────────────────────────────┤
│                         CLOUDINARY (Media)                      │
│   └── Images: upload, transform, CDN                           │
├─────────────────────────────────────────────────────────────────┤
│                         RAZORPAY (Payments)                     │
│   └── Live mode: rzp_live_* key                                │
└─────────────────────────────────────────────────────────────────┘
```