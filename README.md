<div align="center">

  <img src="frontend/public/logo.png" alt="SwadKart Logo" width="120" />

  # SwadKart
  
  **Next-Gen Multi-Vendor Food Delivery Platform | Built at Jagannath University, Jaipur**

  <div>
    <a href="https://swadkart.vercel.app/">
      <img src="https://img.shields.io/badge/Live_Demo-Visit_Now-success?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" />
    </a>
    <a href="https://github.com/theunstopabble/SwadKart-pro">
      <img src="https://img.shields.io/github/stars/theunstopabble/SwadKart-pro?style=for-the-badge&logo=github&color=blue" alt="GitHub Stars" />
    </a>
    <img src="https://img.shields.io/github/last-commit/theunstopabble/SwadKart-pro?style=for-the-badge&color=orange" alt="Last Commit" />
  </div>

  <p align="center">
    <br />
    <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" />
    <img src="https://img.shields.io/badge/Express.js-404D59?style=for-the-badge" />
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
    <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" />
    <img src="https://img.shields.io/badge/Redux_Toolkit-593D88?style=for-the-badge&logo=redux&logoColor=white" />
    <img src="https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
  </p>
</div>

---

## 📖 About The Project

**SwadKart** is a scalable, full-stack food delivery application designed to connect hungry users with the best local restaurants in Jaipur. It features a sophisticated **multi-role ecosystem** (Admin, Restaurant Owner, Delivery Partner, and User) powered by the MERN stack.

Unlike simple clones, SwadKart includes production-grade features like **Real-time Order Tracking (Socket.io)**, **Interactive Heatmaps for Demand Analysis**, **Live Revenue Analytics**, and a **Secure Role-Based Authentication System**.

### 📸 Application Previews

| **Home Page & Discovery** | **Admin Dashboard & Analytics** |
|:-------------------------:|:---------------------:|
| ![Home Page](frontend/assets/screenshot-home.png) | ![Admin Panel](frontend/assets/screenshot-admin.png) |

| **Dynamic Menu Lab** | **Mobile Responsive** |
|:-------------------:|:---------------------:|
| ![Menu Page](frontend/assets/screenshot-menu.png) | ![Mobile View](frontend/assets/screenshot-mobile.png) |

---

## 🌟 Key Features

### 🛍️ User Experience
* **Smart Discovery:** AI-powered restaurant & dish recommendations with natural language search.
* **Voice Search:** Hands-free restaurant/menu search in English & Hindi using Web Speech API.
* **Dynamic Cart:** Real-time price calculation with surge pricing, coupons, and SwadPass discounts.
* **Secure Auth:** Triple authentication — **JWT** (Email/Password), **Firebase** (Google OAuth), **WebAuthn** (Biometric).
* **Order Tracking:** Live GPS driver tracking from "Preparing" → "Out for Delivery" → "Delivered" via Socket.io.
* **Smart Reorder:** One-tap reorder from "Frequently Ordered" carousel based on order history.

### 👑 Admin Command Center
* **Live Analytics:** Revenue, order volume, active users, and restaurant performance trends.
* **Demand Heatmap:** Interactive `Leaflet.js` map visualizing high-demand zones for strategic decisions.
* **User Management:** Role-based access control (Admin, Restaurant Owner, Delivery Partner, User).
* **Coupon Engine:** Create, manage, and track coupon usage with automatic validation.
* **Fraud Detection:** Non-blocking heuristics engine flags suspicious high-value first orders, repeat addresses, and coupon abuse.

### 🏪 Restaurant & Delivery
* **Menu Lab:** Stock management, variant toggling, real-time availability, and AI chatbot-assisted menu discovery.
* **Delivery Dashboard:** Accept/reject orders, real-time GPS tracking, and **OTP-verified** delivery handoff.
* **ETA Prediction:** Dynamic delivery time estimation based on distance, traffic, and order queue.

### 💎 SwadPass Subscription (Like Swiggy One)
* **Free Delivery:** Unlimited free delivery on all orders.
* **Exclusive Discounts:** Additional 10% off every order.
* **Priority Support:** Fast-track customer service.

### 🎮 Gamification & Loyalty
* **Order Streaks:** 3-day, 7-day, and 30-day streak badges.
* **SwadCoins:** Earn coins on every order, redeem for discounts.
* **Achievement Badges:** First Bite, Week Warrior, Month Master, Explorer, Top 10.
* **Referral System:** Invite friends and earn rewards when they place their first paid order.

### 🗣️ AI-Powered Features
* **Groq AI Chatbot:** Natural language restaurant/dish recommendations powered by LLM.
* **Voice Search:** Speak your craving — "Show me biryani under 200" works instantly.

### 🔐 Biometric Security Suite (v2.0)
* **One-Tap Login:** Fingerprint or FaceID via WebAuthn — no password needed.
* **Premium App Lock:** Banking-grade glassmorphism lock screen for wallet & order history.
* **Smart Hardware Detection:** Gracefully falls back to PIN if biometric hardware unavailable.

### 📊 Enterprise Features
* **Surge Pricing:** Dynamic delivery fee multiplier based on active orders vs available drivers.
* **Group Ordering:** Split bills with friends via invite code — equal or item-wise split.
* **Table Reservations:** Book tables with QR code confirmation and guest management.
* **GDPR Compliance:** One-click data export (JSON) and account deletion with full anonymization.
* **Multi-Language:** Full i18n support — English & Hindi with more languages ready to add.
* **PWA:** Installable app with offline support, push notifications, and service worker caching.

| **Premium Lock Screen** | **Profile Control Center** |
|:-------------------:|:---------------------:|
| <img src="frontend/assets/biometric-lock.png" alt="Lock Screen" width="240"/> | <img src="frontend/assets/biometric-profile.png" alt="Profile" width="240"/> |

---

## 🏗️ Architecture & Tech Stack

The project follows a clean **MVC (Model-View-Controller)** architecture with a clear separation of concerns.

### **Frontend (`/frontend`)**
| Layer | Technology |
|---|---|
| Framework | React 18 + Vite |
| State Management | Redux Toolkit + RTK Query ready |
| Styling | Tailwind CSS + Lucide React Icons |
| Routing | React Router DOM v6 |
| Real-time | Socket.io-client |
| Maps | Leaflet.js + React-Leaflet |
| Charts | Recharts |
| AI | Groq SDK (LLM recommendations) |
| Voice | Web Speech API |
| Auth | Firebase Auth + WebAuthn |
| Build | Vite PWA (workbox) |

### **Backend (`/backend`)**
| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Framework | Express.js 5 |
| Database | MongoDB Atlas (Mongoose ODM) |
| Cache | Redis (Upstash) / In-Memory Fallback |
| Authentication | JWT (httpOnly cookies) + Firebase Admin SDK + WebAuthn |
| Real-time | Socket.io with room-based authorization |
| Payments | Razorpay (test/live mode auto-detect) |
| Email | Nodemailer + Brevo (Sendinblue) API |
| Storage | Cloudinary (image uploads) |
| AI | Groq API (Llama 3) |
| Validation | Express Validator + Custom NoSQL Sanitizer |
| Rate Limiting | express-rate-limit (strict on auth endpoints) |
| Security | Helmet, CORS, CSRF protection, XSS prevention |

---

## 🚀 Getting Started

Follow these steps to set up SwadKart locally.

### Prerequisites
* Node.js (v18+)
* MongoDB Connection String (Atlas)
* Google Firebase Project (for Auth)

### 1. Clone the Repository
```bash
git clone https://github.com/theunstopabble/SwadKart-pro.git

```
### 2. Backend Setup

Navigate to the backend folder and install dependencies:
```bash
cd backend
npm install
```

Create a `.env` file in `/backend` and add the following:
```env
# Server
PORT=8000
NODE_ENV=development

# Database
MONGO_URI=your_mongodb_connection_string

# JWT (MUST be 32+ chars — use: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=your_super_secure_random_jwt_secret_here_at_least_32_chars

# Frontend URL (CORS)
FRONTEND_URL=http://localhost:5173

# Email Service (OTP & notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_MAIL=your_email@gmail.com
SMTP_PASSWORD=your_app_password
BREVO_API_KEY=your_brevo_api_key

# Biometric Auth (WebAuthn)
RP_ID=localhost
RP_NAME=SwadKart

# Redis Cache (Optional — falls back to in-memory)
REDIS_URL=your_upstash_or_redis_url

# Payment Gateway (Razorpay)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Cloudinary (Image Uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# AI (Groq LLM for recommendations)
GROQ_API_KEY=gsk_your_groq_api_key

# Firebase Admin SDK (JSON string or path to service account file)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```
Start the backend server:
```bash
node server.js
```

### 3. Frontend Setup

Open a new terminal, navigate to frontend, and install dependencies:
```bash
cd frontend
npm install
```
Create a `.env` file in `/frontend`:
```env
# Leave empty for local dev (Vite proxy handles routing)
# Set to your Vercel URL for production builds
VITE_API_URL=

# Firebase Config (for Google Auth)
VITE_FIREBASE_API_KEY=your_firebase_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
```
Start the React application:
```bash
npm run dev
```
### 📂 Project Structure
```bash
SwadKart-pro/
├── backend/
│   ├── config/             # DB, Cloudinary, Redis, WebAuthn
│   ├── controllers/        # 25+ controllers (User, Order, Admin, Delivery, AI, Gamification, GDPR)
│   ├── middleware/         # Auth, Error, Rate Limit, Fraud Detection, Cache, CSRF
│   ├── models/             # Mongoose Schemas with compound indexes
│   ├── routes/             # 25+ API route modules
│   ├── utils/              # Token generators, email templates, cache helpers
│   └── public/             # robots.txt, static assets
│
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI (Navbar, ChatBot, VoiceSearch, InstallPWA)
│   │   ├── pages/            # 20+ pages (all user roles + new feature pages)
│   │   ├── redux/            # Global State (Cart, User, Order slices)
│   │   ├── utils/            # Firebase config, biometric service, API helpers
│   │   └── App.jsx           # Router with lazy loading + role guards
│   └── .github/workflows/    # CI: backend syntax + frontend lint + build test
│
└── docs/                     # Microservices roadmap, architecture docs
```
### 🛡️ Security & Performance (Production-Hardened)

| Feature | Implementation | Status |
|---|---|---|
| **JWT Security** | 32+ char secret validation, httpOnly cookies, `secure` + `sameSite` | ✅ |
| **CORS** | Strict allowlist — no wildcards, dynamic origin validation | ✅ |
| **Rate Limiting** | Auth: 10/10min, API: 300/15min, Orders: 20/15min | ✅ |
| **NoSQL Injection** | Custom `$` and `.` sanitizer + parameter binding | ✅ |
| **CSRF Protection** | Origin + Referer header validation | ✅ |
| **XSS Prevention** | Helmet headers + content security policy | ✅ |
| **Body Parser Limits** | 10MB max to prevent DoS | ✅ |
| **Fraud Detection** | Non-blocking heuristics on order creation | ✅ |
| **Graceful Shutdown** | SIGTERM → close HTTP → close MongoDB → exit(0) | ✅ |
| **Health Checks** | `/` + `/health` endpoints with MongoDB + Redis status | ✅ |
| **Error Handling** | Centralized middleware: MongoDB, JWT, Cast, Validation errors | ✅ |
| **Unhandled Rejection** | Logged in production, crash in dev for visibility | ✅ |
| **Uncaught Exception** | Always crash + restart to avoid corrupted state | ✅ |
| **MongoDB Pool** | 50 connections prod, `writeConcern: majority`, heartbeat 10s | ✅ |
| **Query Optimization** | `.lean()` on all read-heavy endpoints (3-5x faster) | ✅ |
| **Response Caching** | Redis/in-memory cache on public GET endpoints (1-5 min TTL) | ✅ |
| **Lazy Loading** | All pages lazy-loaded via React Router + Suspense | ✅ |
| **PWA Caching** | Service worker precaches 80+ assets | ✅ |

### 🚀 Production Deployment

| Component | Platform | URL |
|---|---|---|
| **Frontend** | Vercel | `https://swadkart.vercel.app` |
| **Backend** | Render | `https://swadkart-api.onrender.com` |
| **Database** | MongoDB Atlas | `mongodb+srv://...` |
| **Cache** | Upstash Redis | `rediss://...` |
| **Images** | Cloudinary | `https://res.cloudinary.com/...` |
| **Payments** | Razorpay | Test keys auto-detected, live ready |

**Architecture:**
- `frontend/vercel.json` rewrites `/api/*` → Render backend (same-origin cookies)
- Production cookies: `secure: true` + `sameSite: "none"` (cross-origin HTTPS)
- Development cookies: `secure: false` + `sameSite: "lax"` (localhost)
- Environment validation on startup — server **refuses to start** if `JWT_SECRET < 32 chars` or `MONGO_URI` missing

**CI/CD Pipeline:**
- GitHub Actions runs on every push:
  1. Backend syntax check (`node --check` on all files)
  2. Frontend lint (`npx eslint src/`)  
  3. Frontend build test (`npm run build`)
- Vercel auto-deploys frontend on green build

---

## 📞 Contact & Support

<div align="left">
  <p><strong>Author:</strong> Gautam Kumar</p>
  <p><strong>Institution:</strong> Jagannath University, Jaipur, Rajasthan, India</p>

  <a href="https://linkedin.com/in/gautamkr62" target="_blank">
    <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn" />
  </a>
  <a href="https://github.com/theunstopabble" target="_blank">
    <img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" />
  </a>
  <a href="https://x.com/_unstopabble" target="_blank">
    <img src="https://img.shields.io/badge/Twitter-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white" alt="Twitter" />
  </a>
  
</div>

<br />

> **Note:** If you are interested in collaborating on this project or have any queries, feel free to reach out via any of the platforms above. 🚀

<div align="center"> <i>Built with ❤️ & Code. If you find this useful, please give it a ⭐!</i> </div>
