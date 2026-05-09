# SwadKart Tech Stack

## Layer-by-Layer Breakdown

### Presentation Layer (Frontend/PWA)

| Technology | Version | Purpose | Why Used |
|-----------|---------|---------|----------|
| **React** | 19.x | UI Library | Component-based architecture, rich ecosystem, React 19 features (use() hook, improvements) |
| **Vite** | 7.x | Build Tool | Lightning-fast HMR, optimized production builds, native ESM |
| **Tailwind CSS** | 3.4.x | Utility CSS | Rapid UI development, consistent design system, small bundle (purged) |
| **React Router** | 7.x | Client-side Routing | Nested routes, data loaders, SPA navigation with PWA support |
| **Redux Toolkit** | 2.x | State Management | Global state (cart, user, auth), RTK Query for caching, devtools |
| **PWA Plugin** | 0.19.x | Progressive Web App | Service worker, offline support, install prompt, push notifications |
| **Socket.io Client** | 4.x | Real-time | Order tracking, live updates, driver location, notifications |
| **Firebase** | 12.x | Push Notifications | FCM for order updates, promotions, delivery alerts |
| **i18next** | 26.x | i18n | Hindi/English language support, browser detection |
| **Leaflet** | 1.9.x | Maps | OpenStreetMap for delivery tracking, address selection |
| **Recharts** | 3.x | Charts | Restaurant analytics, admin dashboard, sales trends |
| **jsPDF** | 4.x | PDF Generation | Invoice generation, order receipts |
| **Canvas Confetti** | 1.x | Animations | Order success celebration |
| **Lucide React** | 0.562 | Icons | Consistent icon library, tree-shakeable |
| **@react-oauth/google** | 0.12 | Social Login | Google OAuth integration |
| **@simplewebauthn/browser** | 13.x | Biometric Auth | WebAuthn/FIDO2 for fingerprint/face unlock |
| **React Hot Toast** | 2.6 | Notifications | User feedback, success/error messages |

### Application Layer (Backend API)

| Technology | Version | Purpose | Why Used |
|-----------|---------|---------|----------|
| **Node.js** | 22.x | Runtime | Event-driven, scalable, full-stack JS |
| **Express** | 5.x | Web Framework | Minimal, flexible, industry standard for Node APIs |
| **Socket.io** | 4.x | WebSocket Server | Bidirectional real-time communication |
| **JWT** | 9.x | Token Auth | Stateless authentication, Bearer + Cookie fallback |
| **bcryptjs** | 3.x | Password Hashing | Secure password storage (bcrypt rounds) |
| **express-async-handler** | 1.x | Error Handling | Clean async controller error handling |
| **express-rate-limit** | 8.x | Rate Limiting | DoS protection, specific endpoint limits |
| **helmet** | 8.x | Security Headers | XSS, clickjacking, MIME sniffing protection |
| **cors** | 2.x | CORS | Origin whitelist, credentials support |
| **cookie-parser** | 1.x | Cookie Parsing | HttpOnly JWT cookie management |
| **compression** | 1.x | Response Compression | Gzip/Brotli for API responses |

### Data Layer

| Technology | Version | Purpose | Why Used |
|-----------|---------|---------|----------|
| **MongoDB** | 7.x | Database | Document store, flexible schema, GeoJSON for location queries, M0 free tier |
| **Mongoose** | 9.x | ODM | Schema validation, middleware, population, indexes |
| **Redis** | 7.x | Cache | API response caching, session storage, BullMQ queue |
| **ioredis** | 5.x | Redis Client | Cluster support, auto-reconnect, pub/sub |

### Integrations

| Technology | Version | Purpose | Why Used |
|-----------|---------|---------|----------|
| **Razorpay** | 2.x | Payments | India's leading payment gateway, UPI/cards/wallets support |
| **Cloudinary** | 2.x | Media CDN | Image upload, transformation, optimization, CDN delivery |
| **Sharp** | 0.34 | Image Processing | Thumbnail generation, resize, format conversion |
| **Firebase Admin** | 13.x | Push Notifications | Server-side FCM, topic subscriptions |
| **Groq SDK** | 0.37 | AI/Chatbot | SwadKart Genie AI chat, dish recommendations |
| **Brevo (Sendinblue)** | — | Transactional Email | Order confirmations, OTPs, marketing |
| **Nodemailer** | 8.x | Email | Fallback email delivery, templated emails |
| **multer** | 2.x | File Upload | Multipart form handling, Cloudinary storage |
| **multer-storage-cloudinary** | 2.x | Cloudinary Storage | Direct upload to Cloudinary |

### Background Processing

| Technology | Version | Purpose | Why Used |
|-----------|---------|---------|----------|
| **BullMQ** | 5.x | Job Queue | Email queue worker, scheduled jobs, Redis-backed |
| **qrcode** | 1.5 | QR Generation | Payment QR, delivery OTP QR |
| **jspdf-autotable** | 5.x | PDF Tables | Order invoice table formatting |

### Security & DevOps

| Technology | Purpose | Why Used |
|-----------|---------|----------|
| **express-validator** | Input validation | Schema-based request validation |
| **deep-email-validator** | Email validation | MX record check, typo detection |
| **morgan** | HTTP logging | Request/response logging |
| **nodemon** | Dev reload | Auto-restart on code changes |
| **dotenv** | Env management | Environment variable handling |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SWADKART TECHNOLOGY STACK                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                         PRESENTATION LAYER                               │ │
│  │                                                                         │ │
│  │   React 19 + Vite 7                                                     │ │
│  │       │                                                                 │ │
│  │       ├──► Tailwind CSS 3 (UI)                                          │ │
│  │       ├──► Redux Toolkit 2 (State)                                      │ │
│  │       ├──► React Router 7 (Routing)                                     │ │
│  │       ├──► PWA Plugin (vite-plugin-pwa) → Service Worker                │ │
│  │       └──► Firebase 12 → Push Notifications                            │ │
│  │                                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                        │
│                                      ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                         COMMUNICATION LAYER                             │ │
│  │                                                                         │ │
│  │   REST API (JSON)  ◄────────►  Socket.io (WebSocket)                   │ │
│  │         │                              │                                 │ │
│  │         └──► JWT (Bearer + Cookie) ◄──► Cookie-Parser                  │ │
│  │                            │                                           │ │
│  │         express-rate-limit │                                           │ │
│  │                  Helmet ◄──┘                                            │ │
│  │                                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                        │
│                                      ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                         APPLICATION LAYER                                │ │
│  │                                                                         │ │
│  │   Express 5 + Socket.io 4                                              │ │
│  │       │                                                                 │ │
│  │       ├──► Controllers (30+)                                           │ │
│  │       │     ├── authController (JWT/bcrypt)                            │ │
│  │       │     ├── orderController (lifecycle)                            │ │
│  │       │     ├── paymentController (Razorpay)                           │ │
│  │       │     ├── biometricController (WebAuthn)                        │ │
│  │       │     ├── deliveryController (OTP)                               │ │
│  │       │     ├── analyticsController (Groq AI)                          │ │
│  │       │     └── ... (24 more)                                          │ │
│  │       │                                                                 │ │
│  │       ├──► Middleware                                                  │ │
│  │       │     ├── authMiddleware (JWT/Cookie)                            │ │
│  │       │     ├── cacheMiddleware (Redis)                                 │ │
│  │       │     ├── fraudDetection (rate-limit)                            │ │
│  │       │     └── validationMiddleware (express-validator)                │ │
│  │       │                                                                 │ │
│  │       └──► Workers                                                     │ │
│  │             └── BullMQ (email queue, Redis-backed)                     │ │
│  │                                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                        │
│                                      ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                            DATA LAYER                                    │ │
│  │                                                                         │ │
│  │   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐          │ │
│  │   │   MongoDB    │     │    Redis     │     │ Cloudinary   │          │ │
│  │   │    Atlas     │     │    Cloud     │     │    CDN      │          │ │
│  │   │              │     │              │     │              │          │ │
│  │   │ • Users      │     │ • API Cache  │     │ • Images     │          │ │
│  │   │ • Restaurants│     │ • Sessions   │     │ • Thumbnails │          │ │
│  │   │ • Products   │     │ • BullMQ     │     │ • Transforms │          │ │
│  │   │ • Orders     │     │ • Fallback:  │     │ • CDN URLs   │          │ │
│  │   │ • Coupons    │     │   InMemory   │     │              │          │ │
│  │   │ • Notifs     │     │   Map        │     │              │          │ │
│  │   └──────────────┘     └──────────────┘     └──────────────┘          │ │
│  │                                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                      INTEGRATION SERVICES                                │ │
│  │                                                                         │ │
│  │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │ │
│  │   │   Razorpay   │  │   Firebase   │  │    Brevo     │  │   Groq   │  │ │
│  │   │  Payments   │  │  FCM Push    │  │   Emails    │  │  AI/Chat │  │ │
│  │   └──────────────┘  └──────────────┘  └──────────────┘  └──────────┘  │ │
│  │                                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                         DEPLOYMENT LAYER                                 │ │
│  │                                                                         │ │
│  │   GitHub Actions (CI/CD)                                                │ │
│  │         │                                                               │ │
│  │   ┌──────┴──────┐                                                      │ │
│  │   ▼              ▼                                                     │ │
│  │   Vercel        Render                                                │ │
│  │  (Frontend)    (Backend)                                               │ │
│  │  swadkart.     swadkart-backend                                        │ │
│  │  vercel.app    .onrender.com                                           │ │
│  │                                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Why Each Tech Was Chosen

### React 19 over Vue/Angular
- ✅ Largest ecosystem and community
- ✅ Best TypeScript support
- ✅ React 19 improvements (compiler, use() hook)
- ✅ Massive talent pool for hiring

### Vite over Webpack/CRA
- ✅ 10x faster HMR than Webpack
- ✅ Native ESM, no bundling for dev
- ✅ Instant server start
- ✅ Optimized production builds (Rollup)

### MongoDB over PostgreSQL/MySQL
- ✅ Flexible schema for product variants, add-ons
- ✅ GeoJSON for location-based queries (nearby restaurants)
- ✅ Nested documents (orderItems, walletTransactions)
- ✅ M0 free tier on Atlas (startup cost zero)

### Express over Fastify/Koa
- ✅ Battle-tested, most tutorials/documentation
- ✅ Huge middleware ecosystem
- ✅ Express 5 improvements (async errors, improved performance)
- ✅ Most developers know it

### Socket.io over raw WebSockets
- ✅ Automatic fallback to polling
- ✅ Room/namespace support (order rooms, user rooms)
- ✅ Built-in reconnection logic
- ✅ Works behind proxies/load balancers

### Razorpay over Stripe/PayPal
- ✅ India-focused (UPI, Net Banking, cards)
- ✅ Best INR support
- ✅ Simple Indian merchant onboarding
- ✅ Lower transaction fees than international gateways

### Cloudinary over S3/Direct Upload
- ✅ On-the-fly transformations (resize, crop, format)
- ✅ CDN included (global edge network)
- ✅ Admin dashboard for managing images
- ✅ Auto-optimization (WebP, AVIF)

### Firebase over OneSignal/Pusher
- ✅ Free tier generous
- ✅ Native FCM for Android/iOS/PWA
- ✅ Admin SDK for server-side sends
- ✅ Topic-based subscriptions (order updates)

### Groq over OpenAI
- ✅ Faster inference
- ✅ Lower cost
- ✅ Good enough for chat/Recommendations
- ✅ Easy integration with Python-free backend

---

## Dependencies Tree

```
frontend/
├── react 19.x
│   ├── react-dom 19.x
│   └── react-router-dom 7.x
├── vite 7.x
│   └── vite-plugin-pwa 0.19.x
├── @reduxjs/toolkit 2.x
│   └── react-redux 9.x
├── axios 1.x
├── socket.io-client 4.x
├── firebase 12.x
├── i18next 26.x
│   └── react-i18next 17.x
├── leaflet 1.9.x
│   └── react-leaflet 5.x
├── recharts 3.x
├── jspdf 4.x
│   └── jspdf-autotable 5.x
├── lucide-react 0.562.x
├── @react-oauth/google 0.12.x
├── @simplewebauthn/browser 13.x
├── react-hot-toast 2.x
└── canvas-confetti 1.x

backend/
├── express 5.x
│   ├── express-async-handler 1.x
│   ├── express-rate-limit 8.x
│   ├── helmet 8.x
│   ├── cors 2.x
│   ├── cookie-parser 1.x
│   ├── compression 1.x
│   └── express-validator 7.x
├── socket.io 4.x
├── mongoose 9.x
├── jsonwebtoken 9.x
├── bcryptjs 3.x
├── dotenv 17.x
├── axios 1.x
├── bullmq 5.x
│   └── ioredis 5.x
├── razorpay 2.x
├── cloudinary 2.x
├── multer 2.x
│   └── multer-storage-cloudinary 2.x
├── firebase-admin 13.x
├── groq-sdk 0.37.x
├── nodemailer 8.x
├── sharp 0.34.x
├── qrcode 1.5.x
├── bcryptjs 3.x
├── deep-email-validator 0.1.x
├── morgan 1.x
├── @simplewebauthn/server 13.x
└── mammoth 1.x (optional)
```

---

## Performance Considerations

| Optimization | Implementation | Impact |
|-------------|----------------|--------|
| **API Caching** | Redis + cacheMiddleware (5 min TTL on restaurant list) | -70% DB reads |
| **Image Optimization** | Cloudinary auto-format (WebP/AVIF), Sharp thumbnails | -60% image size |
| **Bundle Splitting** | Vite dynamic imports (code splitting) | Faster initial load |
| **Service Worker** | Cache-first for static, network-first for API | Offline support |
| **Gzip/Brotli** | compression middleware | -60% response size |
| **Database Indexes** | 2dsphere on location, text on name, compound indexes | Fast queries |
| **Connection Pooling** | Mongoose connection reuse | +50% throughput |
| **Background Jobs** | BullMQ for emails (non-blocking order creation) | Faster API response |
| **Socket Rooms** | Order-specific rooms (not broadcasting to all) | Scalable real-time |
| **Rate Limiting** | 10 auth, 300 API, 20 orders per user | Security + stability |

---

## Browser Support

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome 90+ | ✅ Full | PWA install, push notifications, WebAuthn |
| Firefox 90+ | ✅ Full | WebAuthn requires HTTPS |
| Safari 15+ | ✅ Full | PWA on iOS, push on macOS |
| Edge 90+ | ✅ Full | Chromium-based |
| Samsung Internet | ✅ Full | Chromium-based |
| iOS Safari | ⚠️ Partial | No background push (APNs only) |
| IE 11 | ❌ Not supported | Security baseline not met |

---

## Development Tools

| Tool | Purpose |
|------|---------|
| **VSCode** | Primary IDE |
| **Postman** | API testing |
| **MongoDB Compass** | Database GUI |
| **Redis Insight** | Redis GUI |
| **Chrome DevTools** | Debugging, PWA audit |
| **Lighthouse** | Performance audit |
| **ngrok** | Webhook testing (local) |
| **Cloudinary Dashboard** | Media management |