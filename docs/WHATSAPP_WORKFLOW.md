# SwadKart WhatsApp Integration — Complete Workflow

## Architecture Overview

```
┌─────────────────┐     REST API      ┌──────────────────┐     WebSocket     ┌────────────┐
│  SwadKart       │ ────────────────▶  │  OpenWA           │ ───────────────▶  │  WhatsApp  │
│  Backend        │ ◀────────────────  │  (Baileys Engine) │ ◀───────────────  │  Servers   │
│  (Render)       │   Webhook (HMAC)   │  (Render)         │                  │            │
└─────────────────┘                    └──────────────────┘                  └────────────┘
```

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **SwadKart Backend** | `https://swadkart-5wtf.onrender.com` | Controllers, chatbot, webhook handler |
| **OpenWA** | `https://openwa-api-e458.onrender.com` | WhatsApp API gateway (Baileys engine) |
| **WhatsApp Session** | `swadkart-bot-3` | Connected to `+91 8905783075` |
| **Webhook** | `POST /api/v1/whatsapp/webhook` | Receives inbound messages from OpenWA |
| **Cron Jobs** | cron-job.org (every 14 min) | Prevents Render cold sleep |

### Key Environment Variables

| Variable | Value |
|----------|-------|
| `OPENWA_BASE_URL` | `https://openwa-api-e458.onrender.com` |
| `OPENWA_API_KEY` | `owa_k1_07bd87bfcea047e8eb18b5d95d4296023fbcf732aafb99a3262451faf887db9d` |
| `OPENWA_WEBHOOK_SECRET` | `4d1410c208cf868eb13a54923dd9139e22cdfaffd990fa2c0a7fbb20d19668f3` |
| `OPENWA_DEFAULT_SESSION` | `swadkart-bot-3` |
| `OPENWA_TIMEOUT_MS` | `15000` |
| `OPENWA_ISOLATE_SESSIONS` | `true` |
| `OPENWA_RATE_LIMIT` | `60` |

---

## 1. User Opt-In System

Every WhatsApp notification is gated by user preferences. **All flags default to `false`** — no WhatsApp messages are sent unless the user explicitly opts in.

### Schema (`backend/models/userModel.js`)

```js
phone:              { type: String, default: null },         // Sparse unique index
phoneVerified:      { type: Boolean, default: false },      // Must verify via WhatsApp OTP
whatsappNotifications: {
  orders:     { type: Boolean, default: false },  // Order confirmations, status, delivery alerts
  promotions: { type: Boolean, default: false },  // Coupon/promo broadcasts
  otp:        { type: Boolean, default: false },  // OTP messages on register/resend
}
```

### Phone Verified Guard

Every outbound user notification checks `user.phoneVerified` before sending. Even if a phone number exists, no WhatsApp message is delivered until the user has proven ownership via OTP.

| Function | Guard |
|----------|-------|
| `sendOrderConfirmation()` | `if (!user?.phoneVerified) return;` |
| `sendStatusUpdate()` | `if (!user?.phoneVerified) return;` |
| `sendDriverAssigned()` | `if (!user?.phoneVerified) return;` |
| `sendOrderCancelled()` | `if (!user?.phoneVerified) return;` |
| `sendPromotional()` | `if (!user?.phoneVerified) return;` |
| `sendPhoneOTP()` | *(unguarded — OTP is how they verify)* |
| `sendDeliveryRequest()` | *(goes to partner, not user)* |
| `sendRestaurantAlert()` | *(goes to restaurant, not user)* |

### Phone Verification Flow (`PhoneVerificationModal.jsx`)

```
Two-step modal (shown at checkout or via Profile → Verify Now):

  Step 1: Enter phone number
    → POST /api/v1/whatsapp/send-otp (auth-protected)
    → Sends 6-digit OTP via WhatsApp → stored in in-memory Map (5-min TTL)
    → User sees "Check WhatsApp for OTP"

  Step 2: Enter OTP
    → POST /api/v1/whatsapp/verify-phone-otp (auth-protected)
    → Backend sets phone + phoneVerified: true on user document
    → Redux store updated, modal closes
```

### Google Auth Phone Flow (`GoogleAuth.jsx`)

```
User signs in with Google
  → POST /api/v1/users/google-check
  ├─ Existing user → login directly
  └─ New user → Phone modal appears:
       ├─ Enter phone → POST /api/v1/users/google-register
       │    phone + phoneVerified: false saved to DB
       │    User sees yellow warning:
       │    "⚠️ Make sure it's a genuine WhatsApp number..."
       │    → Must verify at checkout or in Profile before receiving notifications
       └─ Skip → phone: null saved → verify at checkout
```

---

## 2. Outbound Notifications (App → User)

### 2a. Order Confirmation

**Trigger:** `POST /api/v1/orders`

```
addOrderItems() [orderController.js:460-470]
  └─ checks: waUser.whatsappNotifications.orders && waUser.phone
  └─ sendText("default", "91{phone}@c.us",
       "✅ Order Confirmed! Your SwadKart order #${orderRef} of ₹${totalPrice} is placed.")
  └─ fire-and-forget (.catch(() => {}))
```

### 2b. Order Status Update

**Trigger:** `PUT /api/v1/orders/:id/status`

```
updateOrderStatus() [orderController.js:737-747]
  └─ checks: statusUser.whatsappNotifications.orders && statusUser.phone
  └─ sendText("default", "91{phone}@c.us",
       "📦 Order Update: Your SwadKart order #${orderRef} is now: ${status}")
  └─ fire-and-forget (.catch(() => {}))
```

### 2c. Delivery Partner Assigned

**Trigger:** `PUT /api/v1/orders/:id/assign`

```
assignDeliveryPartner() [deliveryController.js:123-136]

  Customer:
  └─ checks: customer.whatsappNotifications.orders && customer.phone
  └─ sendText("default", "91{phone}@c.us",
       "🛵 Delivery partner assigned for order #${orderRef}.")

  Partner:
  └─ checks: partner.whatsappNotifications.orders && partner.phone
  └─ sendText("default", "91{phone}@c.us",
       "🛵 New delivery task: Order #${orderRef}. Pickup and deliver to customer.")
```

### 2d. Delivery Completed

**Trigger:** `PUT /api/v1/orders/:id/deliver`

```
updateOrderToDelivered() [deliveryController.js:306-314]
  └─ checks: deliveredUser.whatsappNotifications.orders && deliveredUser.phone
  └─ sendText("default", "91{phone}@c.us",
       "✅ Delivered! Your SwadKart order #${orderRef} has arrived. Enjoy your meal! 🍽️")
```

### 2e. OTP via WhatsApp

**Trigger:** `POST /api/v1/users/register`

```
registerUser() [authController.js:69-71, 116-118]
  └─ Two scenarios:
  │    ├─ Existing unverified user (resend): line 69
  │    └─ New user creation: line 116
  └─ checks: user.whatsappNotifications.otp && user.phone
  └─ sendText("default", "91{phone}@c.us",
       "🔐 Your SwadKart OTP is: ${otp}. Valid for 10 minutes.")
```

### 2f. Coupon Broadcast (Admin)

**Trigger:** `POST /api/v1/coupons`

```
createCoupon() [couponController.js:48-61]
  └─ Queries: User.find({ "whatsappNotifications.promotions": true })
  └─ for each opted-in user:
       sendText("default", "91{phone}@c.us",
         "🎉 New Coupon: ${code} — ${discount}% off! Min order: ₹${minOrder}. Valid till ${date}")
```

---

## 3. Inbound Flow (User → App)

### 3a. Webhook Reception

```
User sends WhatsApp message
  → OpenWA detects message.received event
  → POST https://swadkart-5wtf.onrender.com/api/v1/whatsapp/webhook
  → parseWebhookPayload(rawBody, headers)
      ├─ verifySignature(): HMAC-SHA256 against OPENWA_WEBHOOK_SECRET
      └─ payload validation
```

### 3b. Message Processing

```
handleWebhookEvent(event, sessionId, data) [whatsappWebhook.js:147]

  "message.received" → handleIncomingMessage(sessionId, data)
    ├─ isDuplicate() — In-memory Map with 60s TTL (prevents double-processing)
    ├─ logInbound() — Logs to WhatsAppLog model
    └─ routeToChatbot(chatId, senderPhone, body, sessionId)
         ├─ getOrCreateSession(phone) — Optional session isolation
         └─ runChatPipeline() with 15s AbortController timeout
              ├─ detectLanguage()
              ├─ classifyIntent() + analyzeSentiment() (parallel)
              ├─ retrieveProducts() if order/recommendation intent
              ├─ Groq LLM → multi-tool loop (max 5 iterations)
              ├─ Persist to Conversation model
              └─ Returns { reply, intent, sentiment }

  Intent Routing:
    "complaint"       → handleComplaintIntent()
    │                   └─ Creates SupportMessage + acknowledgment reply
    │
    "order_inquiry"   → updateOrderNote()
    │  "order_placement" ── Appends WhatsApp reply to order.whatsappOrderNote
    │
    (default)         → replyToUser() — Sends chatbot reply via OpenWA
```

### 3c. Webhook Event Types

| Event | Handler | Purpose |
|-------|---------|---------|
| `message.received` | `handleIncomingMessage()` | Process user messages via chatbot |
| `session.status` | `handleSessionStatus()` | Log connection/disconnection |
| `message.ack` | `handleMessageAck()` | Update delivery status in WhatsAppLog |

---

## 4. Chatbot Pipeline

### Shared Pipeline

Same function (`runChatPipeline()`) used by both web and WhatsApp:

| Source | Route | File |
|--------|-------|------|
| Web (JSON) | `POST /api/v1/chat` | `chatController.js` |
| Web (SSE) | `POST /api/v1/chat/stream` | `chatStreamController.js` |
| WhatsApp | `POST /api/v1/whatsapp/webhook` | `whatsappWebhook.js` |

### Pipeline Steps (`chatPipeline.js`)

```
runChatPipeline(input, history, options)
  │
  ├─ Promise.race() with PIPELINE_TIMEOUT_MS (15s)
  │
  └─ executePipeline()
       ├─ Step 1:  Load conversation history
       ├─ Step 2:  detectLanguage() — Hindi/English
       ├─ Step 3:  classifyIntent() + analyzeSentiment() [parallel]
       ├─ Step 4:  retrieveProducts() — if order/recommendation intent
       ├─ Step 5:  fitToBudget() — token management
       ├─ Step 6:  buildToolRegistry() — auth-conditional tools
       ├─ Step 7:  multi-tool loop — max 5 LLM iterations
       ├─ Step 8:  emit SSE events (if streaming)
       ├─ Step 9:  persist messages to MongoDB
       └─ Step 10: escalation check — 3 consecutive negative sentiments → alert
```

---

## 5. WhatsApp Service Layer

### Core Functions (`whatsappService.js`)

| Function | Line | Purpose |
|----------|------|---------|
| `api()` | 6 | Axios instance → OpenWA (with API key) |
| `retry(fn, attempts)` | 18 | Exponential backoff (2ⁿ × 200ms) |
| `extractPhone(chatId)` | 33 | Strip `@c.us`, `91` prefix |
| `logSend()` | 38 | Log + enqueue to retry queue on failure |

### Session Management

| Function | Purpose |
|----------|---------|
| `createSession(name, config)` | Create new OpenWA session |
| `startSession(sessionId)` | Start session |
| `stopSession(sessionId)` | Stop session |
| `getSession(sessionId)` | Get session status |
| `listSessions()` | List all sessions |
| `getQRCode(sessionId)` | Get QR for pairing |
| `deleteSession(sessionId)` | Delete session |

### Message Sending

| Function | Purpose |
|----------|---------|
| `sendText(sessionId, chatId, text, logCtx)` | **Primary** — used by all controllers |
| `sendImage(sessionId, chatId, url, caption, logCtx)` | Send image |
| `sendDocument(sessionId, chatId, url, filename, caption, logCtx)` | Send document |
| `sendTemplate(sessionId, chatId, templateName, vars, logCtx)` | WhatsApp Business template |
| `sendBulk(sessionId, messages, options)` | Bulk messages |

### Convenience Wrappers (Template-Powered)

All wrappers use `whatsappTemplates.js` for consistent formatting (bold, italic, monospace, emoji, dividers).

| Function | Purpose | Template |
|----------|---------|----------|
| `sendOrderConfirmation(order, user)` | Full receipt with items, variants, addons, address, total | `getORDER_CONFIRMATION` |
| `sendStatusUpdate(order, user, newStatus)` | Status change (Preparing/Ready/Out for Delivery/Delivered) | `getORDER_STATUS` |
| `sendOTP(phone, otp)` | Account verification OTP (10-min valid) | `getOTP` |
| `sendPhoneOTP(phone, otp)` | Checkout phone verification OTP (5-min valid) | `getPhoneOTP` |
| `sendPromotional(user, coupon)` | Coupon/discount offer | `getPROMOTIONAL` |
| `sendDriverAssigned(order, user, partner)` | Delivery partner name + contact | `getDRIVER_ASSIGNED` |
| `sendOrderCancelled(order, user, reason)` | Cancel reason + refund note | `getORDER_CANCELLED` |
| `sendDeliveryRequest(order, partner)` | Partner assignment with items + drop location | `getDELIVERY_REQUEST` |
| `sendRestaurantAlert(order, restaurantName)` | Kitchen order notification with items to prepare | `getRESTAURANT_ALERT` |

### WhatsApp Templates (`whatsappTemplates.js`)

| Template | Formatting |
|----------|------------|
| `*bold*`, `_italic_`, `~strike~`, `` `code` `` | Standard WhatsApp markdown |
| `─────────────────────` | `WA_SEPARATOR` divider lines |
| `esc(str)` | Escapes `* _ ~ `` ` to prevent markdown injection |
| All user content | Passed through `esc()` before interpolation |

---

## 6. Retry & Logging

### Retry Queue (`whatsappRetryQueue.js`)

```
Schedule: setInterval every 30s
Query:    WhatsAppLog entries with status "failed" in last 24h
Max:      3 retries per message
Success:  Updates status → "sent"
Exhausted: Updates status → "cancelled"
```

### Logger (`whatsappLogger.js`)

| Function | Purpose |
|----------|---------|
| `logOutbound()` | Log sent messages to WhatsAppLog |
| `logInbound()` | Log received messages |
| `updateMessageStatus()` | Update delivery status from ACK webhooks |

### WhatsAppLog Model

```js
{
  direction: "outbound" | "inbound",
  type: "text" | "image" | "template",
  phone: String,
  messageId: String,
  status: "sent" | "delivered" | "read" | "failed",
  duration: Number,       // ms
  user: ObjectId (ref),
  order: ObjectId (ref),
  metadata: Mixed,
  retryCount: Number,
  createdAt: Date
}
```

---

## 7. Routes

### WhatsApp Routes (`whatsappRoutes.js`)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/v1/whatsapp/webhook` | HMAC | Inbound webhook from OpenWA |
| `GET` | `/api/v1/whatsapp/health` | — | Health check (lists sessions) |
| `GET` | `/api/v1/whatsapp/metrics` | — | 24h/1h metrics by status & type |
| `POST` | `/api/v1/whatsapp/send-otp` | Bearer | Sends 6-digit WhatsApp OTP, stores in memory Map (5-min TTL) |
| `POST` | `/api/v1/whatsapp/verify-phone-otp` | Bearer | Verifies OTP, saves phone + sets `phoneVerified: true` |

---

## 8. Fire-and-Forget Pattern

All WhatsApp notifications use the fire-and-forget pattern:

```js
sendText(sessionId, chatId, message)
  .catch(() => {})   // Non-blocking — API response never waits for WhatsApp
```

Benefits:
- **API latency unaffected** — WhatsApp failures don't slow down order placement
- **Automatic retry** — Failed sends go to retry queue (30s interval, 3 max)
- **Full audit trail** — Every send/receive logged in WhatsAppLog

---

## 9. Session Management

### Current Session

| Property | Value |
|----------|-------|
| Name | `swadkart-bot-3` |
| Status | `ready` |
| Phone | `+91 8905783075` |
| Engine | Baileys (pure JS, no Chrome) |
| Platform | Render Free Tier (512MB) |

### Session Isolation

When `OPENWA_ISOLATE_SESSIONS=true` (default), incoming webhooks create a **separate OpenWA session per phone number**. Outbound notifications always use `OPENWA_DEFAULT_SESSION`.

---

## 10. Complete End-to-End Diagram

```
                                    ┌───────────────────────────────┐
                                    │      WhatsApp User            │
                                    │   (Phone Number)              │
                                    └──────────┬────────────────────┘
                                               │
                                     ┌─────────▼──────────┐
                                     │     OpenWA          │
                                     │  (Baileys Engine)   │
                                     │  Render Free Tier   │
                                     └────┬────────────┬───┘
                                          │            │
                                   Webhook│            │REST API
                                          │            │
                               ┌──────────▼───┐  ┌─────▼──────────┐
                               │  SwadKart     │  │ SwadKart       │
                               │  Webhook      │  │ Controllers    │
                               │  Handler      │  │ (Order/Auth/   │
                               │  (whatsapp    │  │  Delivery/     │
                               │   Webhook.js) │  │  Coupon)       │
                               │               │  │                │
                               │  routeTo      │  │ sendText()     │
                               │  Chatbot()    │  │ .catch(()=>{}) │
                               └───────┬───────┘  └────────────────┘
                                       │
                              ┌────────▼────────┐
                              │  Chat Pipeline   │
                              │  (chatPipeline)  │
                              │                  │
                              │  Groq LLM        │
                              │  + Tools         │
                              │  + Intent        │
                              │    Classification │
                              └──────────────────┘
```

## 11. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Fire-and-forget** | WhatsApp failures never block the main API |
| **User opt-in (default false)** | Privacy-first; no spam without consent |
| **phoneVerified guard** | Prevents random number entry — user must prove ownership via OTP before receiving notifications |
| **No OTP at Google signup** | Reduces signup friction; user can skip phone or enter unverified, verify later at checkout or in Profile |
| **MongoDB retry queue** | No Redis dependency (Render free tier limitation) |
| **Baileys over whatsapp-web.js** | Baileys is pure JS — no Chrome needed, fits 512MB |
| **Shared chatbot pipeline** | Web + WhatsApp use same intent/tool engine |
| **HMAC-SHA256 webhook** | Verifies webhooks actually came from OpenWA |
| **60s dedup window** | Prevents double-processing if OpenWA retries |
| **Professional WhatsApp templates** | `whatsappTemplates.js` — formatted messages (bold, italic, dividers) matching email quality |
