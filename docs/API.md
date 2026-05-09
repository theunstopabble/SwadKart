# SwadKart API Reference

## Base URL

```
Production: https://swadkart-backend.onrender.com/api/v1
Local:      http://localhost:8000/api/v1
```

## Authentication

All protected routes require either:
- **Bearer Token**: `Authorization: Bearer <jwt_token>`
- **HttpOnly Cookie**: Automatically sent with credentials (CORS must allow origin)

## Middleware Stack

```
Rate Limit (300/15min on /api)
  ↓
Helmet (Security Headers)
  ↓
CORS (Origin Whitelist)
  ↓
CSRF Protection (Origin/Referer check)
  ↓
Custom Sanitizer (NoSQL Injection Prevention)
  ↓
Auth Middleware (JWT/Cookie)
  ↓
Role Authorization (optional)
```

---

## 👥 User Routes (`/users`)

### Register
```
POST /api/v1/users/register
```
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | ✅ | Full name (2-50 chars) |
| email | string | ✅ | Valid email (lowercase) |
| password | string | ✅ | Min 6 chars |
| phone | string | ✅ | 10 digits |
| referralCode | string | ❌ | Referred by code |

**Response:** `201 Created`
```json
{
  "message": "Registration successful",
  "token": "eyJhbGciOiJIUzI1...",
  "user": { "name": "...", "email": "...", "role": "user" }
}
```

### Login
```
POST /api/v1/users/login
```
| Field | Type | Required |
|-------|------|----------|
| email | string | ✅ |
| password | string | ✅ |

**Response:** `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1...",
  "user": { "name": "...", "role": "user", "walletBalance": 0 }
}
```

### Verify Email (OTP)
```
POST /api/v1/users/verify-email
```
| Field | Type | Required |
|-------|------|----------|
| email | string | ✅ |
| otp | string | ✅ (6 digits) |

### Logout
```
POST /api/v1/users/logout
```
**Response:** `200 OK` — Clears HttpOnly cookie

### Forgot Password
```
POST /api/v1/users/password/forgot
```
| Field | Type | Required |
|-------|------|----------|
| email | string | ✅ |

**Response:** `200 OK`
```json
{ "message": "Reset link sent to email" }
```

### Reset Password
```
PUT /api/v1/users/password/reset/:token
```
| Field | Type | Required |
|-------|------|----------|
| password | string | ✅ (min 6 chars) |

### Google Auth
```
POST /api/v1/users/google-check    # Check if Google user exists
POST /api/v1/users/google-register # Register new Google user
```

### Get Public Restaurants
```
GET /api/v1/users/restaurants
```
**Response:** `200 OK` — Array of verified restaurants (cached 5 min)

### Newsletter
```
POST /api/v1/users/newsletter
```

### Contact Support
```
POST /api/v1/users/contact-support
```

### Profile (Protected)
```
GET /api/v1/users/profile         # Get own profile
PUT /api/v1/users/profile         # Update own profile
```
**Request Body:**
```json
{
  "name": "John Doe",
  "phone": "9876543210",
  "description": "About me",
  "password": "newpassword123"
}
```

### Biometric Status (Protected)
```
GET  /api/v1/users/profile/biometric-status
PUT  /api/v1/users/profile/biometric-status
```
**Request Body (PUT):**
```json
{ "isEnabled": true }
```

### Get All Users (Admin)
```
GET /api/v1/users/admin/all
```
**Response:** All users with roles: user, delivery_partner, restaurant_owner

### Create Shop (Admin)
```
POST /api/v1/users/admin/create-shop
```
| Field | Type | Required |
|-------|------|----------|
| name | string | ✅ |
| email | string | ✅ |
| password | string | ✅ |
| image | string | ❌ |

### Create Dummy Shop (Admin)
```
POST /api/v1/users/admin/create-dummy
```
| Field | Type | Required |
|-------|------|----------|
| name | string | ✅ |
| image | string | ❌ |

### Seed Database (Admin)
```
POST /api/v1/users/admin/seed
```
Creates sample restaurants and menu items for development.

### Update User by ID (Admin)
```
PUT /api/v1/users/admin/user/:id
DELETE /api/v1/users/admin/user/:id
```

### Get Delivery Partners (Admin/Owner)
```
GET /api/v1/users/delivery-partners
```
**Response:** List of users with role `delivery_partner`

---

## 🍔 Restaurant Routes (`/restaurants`)

### List Restaurants (Public, Cached)
```
GET /api/v1/restaurants
```
**Query Params:** `?verified=true&page=1&limit=10`

### Top Restaurants (Cached)
```
GET /api/v1/restaurants/top
```

### Get Single Restaurant
```
GET /api/v1/restaurants/:id
```

### Create Restaurant (Owner)
```
POST /api/v1/restaurants
```
| Field | Type | Required |
|-------|------|----------|
| name | string | ✅ |
| address | string | ✅ |
| image | string | ✅ |
| description | string | ❌ |
| openingTime | string | ❌ |
| closingTime | string | ❌ |

### Get Own Restaurant (Owner)
```
GET /api/v1/restaurants/owner/settings
PUT /api/v1/restaurants/settings
```

### Approve Restaurant (Admin)
```
PUT /api/v1/restaurants/:id/approve
```

### Update Restaurant (Admin)
```
PUT /api/v1/restaurants/:id
```

### Delete Restaurant (Admin)
```
DELETE /api/v1/restaurants/:id
```

### Create Review
```
POST /api/v1/restaurants/:id/reviews
```
**Request Body:**
```json
{ "rating": 5, "comment": "Amazing food!" }
```

### Get All Restaurants (Admin)
```
GET /api/v1/restaurants/admin/all
```

---

## 🍕 Product Routes (`/products`)

### List Products (Public, Cached)
```
GET /api/v1/products
```
**Query Params:** `?category=Burgers&restaurantId=xxx`

### Get Products by Restaurant (Cached)
```
GET /api/v1/products/restaurant/:id
```

### Create Product (Admin/Owner)
```
POST /api/v1/products
```
| Field | Type | Required |
|-------|------|----------|
| name | string | ✅ |
| description | string | ✅ |
| price | number | ✅ |
| category | string | ✅ |
| image | string | ✅ |
| restaurantId | string | ✅ |
| isVeg | boolean | ✅ |
| variants | array | ❌ |
| addons | array | ❌ |

**Example variants:**
```json
[{ "name": "Small", "price": 100 }, { "name": "Large", "price": 200 }]
```

### Update Product
```
PUT /api/v1/products/:id
DELETE /api/v1/products/:id
```

### Toggle Stock
```
PATCH /api/v1/products/:id/toggle-stock
```

### Create Review
```
POST /api/v1/products/:id/reviews
```
**Request Body:**
```json
{ "rating": 5, "comment": "Best burger in town!" }
```

---

## 🛒 Order Routes (`/orders`)

### Create Order (User)
```
POST /api/v1/orders
```
**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "orderItems": [
    {
      "name": "Veg Burger",
      "qty": 2,
      "price": 120,
      "image": "https://...",
      "product": "product_id",
      "restaurant": "restaurant_id",
      "selectedVariant": { "name": "Large", "price": 150 },
      "selectedAddons": [{ "name": "Extra Cheese", "price": 30 }]
    }
  ],
  "shippingAddress": {
    "fullName": "John Doe",
    "address": "123 Main St",
    "city": "Mumbai",
    "postalCode": "400001",
    "country": "India",
    "state": "Maharashtra",
    "phone": "9876543210",
    "lat": 19.076,
    "lng": 72.877
  },
  "paymentMethod": "Online",
  "couponCode": "FESTIVE50",
  "tipAmount": 20
}
```

**Response:** `201 Created`
```json
{
  "message": "Order placed",
  "order": { "_id": "...", "totalPrice": 310, "orderStatus": "Placed" }
}
```

### Get My Orders (User)
```
GET /api/v1/orders/myorders
```

### Get Order by ID (User)
```
GET /api/v1/orders/:id
```

### Cancel Order (User)
```
PUT /api/v1/orders/:id/cancel
```

### Update Order Status (Admin/Owner)
```
PUT /api/v1/orders/:id/status
```
**Request Body:**
```json
{ "orderStatus": "Preparing" }
```

### Mark Order Paid
```
PUT /api/v1/orders/:id/pay
```

### Assign Delivery Partner (Admin/Owner)
```
PUT /api/v1/orders/:id/assign
```
**Request Body:**
```json
{ "deliveryPartnerId": "user_id" }
```

### Get Restaurant Orders (Owner)
```
GET /api/v1/orders/restaurant-orders
```

### Get All Orders (Admin)
```
GET /api/v1/orders
```

### Get Sales Stats (Admin/Owner)
```
GET /api/v1/orders/sales-stats
```

### Analytics (Admin/Owner)
```
GET /api/v1/orders/analytics
```

### Heatmap (Admin)
```
GET /api/v1/orders/heatmap
```

---

## 🛵 Delivery Routes (`/orders`)

### Get My Deliveries (Partner)
```
GET /api/v1/orders/my-deliveries
```

### Accept/Reject Delivery (Partner)
```
PUT /api/v1/orders/:id/delivery-action
```
**Request Body:**
```json
{ "action": "accept" }  // or "reject"
```

### Deliver Order (Partner/Admin)
```
PUT /api/v1/orders/:id/deliver
```
**Request Body:**
```json
{ "otp": "1234" }
```

### Trigger SOS (Partner)
```
POST /api/v1/orders/sos
```
**Request Body:**
```json
{ "lat": 19.076, "lng": 72.877, "address": "123 Main St" }
```

---

## 💳 Payment Routes (`/payment`)

### Get Razorpay Key
```
GET /api/v1/payment/key
```

### Create Order (Razorpay)
```
POST /api/v1/payment/create
```
**Request Body:**
```json
{ "orderId": "order_id", "amount": 299, "currency": "INR" }
```

### Verify Payment
```
POST /api/v1/payment/verify
```
**Request Body:**
```json
{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "xxx"
}
```

### Webhook (Razorpay)
```
POST /api/v1/payment/webhook
```
Raw body required. Signature verified server-side.

---

## 🎫 Coupon Routes (`/coupons`)

### Get Available Coupons
```
GET /api/v1/coupons/available
```
Optional auth. Returns coupons applicable for user.

### Validate Coupon (User)
```
POST /api/v1/coupons/validate
```
**Request Body:**
```json
{ "code": "FESTIVE50", "orderValue": 500 }
```

### Create Coupon (Admin)
```
POST /api/v1/coupons
```
| Field | Type | Required |
|-------|------|----------|
| code | string | ✅ (uppercase) |
| discountPercentage | number | ✅ |
| minOrderValue | number | ✅ |
| maxDiscountAmount | number | ✅ |
| expirationDate | date | ✅ |

### Get All Coupons (Admin)
```
GET /api/v1/coupons
```

### Update Coupon (Admin)
```
PUT /api/v1/coupons/:id
DELETE /api/v1/coupons/:id
```

---

## 🔐 Biometric Routes (`/biometric`)

### Start Registration
```
GET /api/v1/biometric/register/start
```

### Verify Registration
```
POST /api/v1/biometric/register/verify
```
**Request Body:**
```json
{
  "credentialId": "xxx",
  "credentialPublicKey": "xxx",
  "counter": 1
}
```

### Start Login
```
GET /api/v1/biometric/login/start
```

### Verify Login
```
POST /api/v1/biometric/login/verify
```
**Request Body:**
```json
{
  "credentialId": "xxx",
  "authenticatorAssertionResponse": {}
}
```

---

## 🔔 Notification Routes (`/notifications`)

### Get My Notifications
```
GET /api/v1/notifications/my
```

### Mark as Read
```
PATCH /api/v1/notifications/read
```
**Request Body:**
```json
{ "ids": ["notif_id1", "notif_id2"] }  // or { "ids": "all" }
```

### Send Notification (Admin)
```
POST /api/v1/notifications/send
```
**Request Body:**
```json
{ "userId": "...", "title": "...", "body": "...", "type": "promotion" }
```

### Bulk Send (Admin)
```
POST /api/v1/notifications/bulk
```

---

## 💰 Loyalty & Wallet Routes (`/loyalty`)

### Get Loyalty Profile
```
GET /api/v1/loyalty/profile
```
**Response:**
```json
{
  "swadCoins": 150,
  "totalEarned": 500,
  "totalRedeemed": 350,
  "tier": "Silver"
}
```

### Redeem Coins
```
POST /api/v1/loyalty/redeem
```
**Request Body:**
```json
{ "coins": 100 }
```

### Admin Adjust Coins
```
POST /api/v1/loyalty/admin/adjust
```

---

## 🎁 Referral Routes (`/referral`)

### Validate Referral Code
```
POST /api/v1/referral/validate
```
**Request Body:**
```json
{ "code": "ABC123" }
```

### Get My Referrals
```
GET /api/v1/referral/my
```

### Get All Referrals (Admin)
```
GET /api/v1/referral/all
```

---

## 🔁 Reorder Routes (`/reorder`)

### Get Frequent Items
```
GET /api/v1/reorder/frequent
```

### Get Recent Orders (for reorder)
```
GET /api/v1/reorder/recent
```

---

## 📅 Reservations Routes (`/reservations`)

### Create Reservation
```
POST /api/v1/reservations
```
**Request Body:**
```json
{
  "restaurantId": "...",
  "date": "2026-05-15",
  "time": "19:00",
  "guests": 4,
  "specialRequests": "Window seat"
}
```

### Get My Reservations
```
GET /api/v1/reservations/my
```

### Cancel Reservation
```
DELETE /api/v1/reservations/:id
```

### Update Status (Owner/Admin)
```
PATCH /api/v1/reservations/:id/status
```

### Get Restaurant Reservations
```
GET /api/v1/reservations/restaurant/:id
```

---

## 👥 Group Order Routes (`/group-orders`)

### Create Group Order
```
POST /api/v1/group-orders
```

### Join Group Order
```
POST /api/v1/group-orders/join
```
**Request Body:**
```json
{ "groupOrderId": "...", "inviteCode": "..." }
```

### Get Group Order
```
GET /api/v1/group-orders/:id
```

### Add to Group Cart
```
PUT /api/v1/group-orders/:id/cart
```

### Calculate Split
```
GET /api/v1/group-orders/:id/split
```

---

## 🎟️ Subscription / SwadPass Routes

### Get SwadPass Status
```
GET /api/v1/swadpass/status
```

### Subscribe
```
POST /api/v1/swadpass/subscribe
```
**Request Body:**
```json
{ "plan": "monthly" }  // or "yearly"
```

### Cancel
```
DELETE /api/v1/swadpass/cancel
```

---

## 🏆 Gamification Routes

### Get Stats
```
GET /api/v1/gamification/stats
```
**Response:**
```json
{
  "orderStreak": 5,
  "longestStreak": 12,
  "badges": [
    { "name": "First Order", "description": "..." }
  ],
  "swadCoins": 1500
}
```

---

## 📊 Analytics Routes

### Leaderboard (Cached 60s)
```
GET /api/v1/analytics/leaderboard
```

### Restaurant Performance
```
GET /api/v1/analytics/restaurant/:id/performance
```

### Refresh Score (Admin)
```
POST /api/v1/analytics/restaurant/:id/refresh
```

### Admin Summary
```
GET /api/v1/analytics/admin/summary
```

### Daily Trends (Admin)
```
GET /api/v1/analytics/admin/trends
```

### Top Restaurants (Admin)
```
GET /api/v1/analytics/admin/top-restaurants
```

### Top Products (Admin)
```
GET /api/v1/analytics/admin/top-products
```

### AI Recommendations
```
GET /api/v1/analytics/recommendations
```

---

## 📦 Inventory Routes

### Get Low Stock Products
```
GET /api/v1/inventory/low-stock
```

### Bulk Restock
```
POST /api/v1/inventory/bulk-restock
```
**Request Body:**
```json
{ "items": [{ "productId": "...", "quantity": 50 }] }
```

### Toggle Auto-Disable
```
PATCH /api/v1/inventory/:id/auto-disable
```

---

## 💵 Payout Routes

### Get Restaurant Earnings
```
GET /api/v1/payouts/restaurant/:id
```

### Request Payout
```
POST /api/v1/payouts/restaurant/:id/request
```

### Get All Payouts (Admin)
```
GET /api/v1/payouts/admin/all
```

### Mark Payout Paid (Admin)
```
PATCH /api/v1/payouts/admin/:id/pay
```

---

## 💬 Chat / AI Routes

### Chat with AI Genie
```
POST /api/v1/chat
```
**Request Body:**
```json
{
  "message": "What are the best burgers nearby?",
  "context": { "lastOrder": "..." }
}
```
**Request Options:** `multipart/form-data` with up to 3 attachments (5MB each)

---

## 📸 Image Routes

### Generate Thumbnail
```
GET /api/v1/image/thumbnail?url=...&width=200&height=200
```

---

## 🚀 Surge Pricing Routes

### Get Surge Status (Public)
```
GET /api/v1/surge/status
```

### Get Config (Admin)
```
GET /api/v1/surge/config
```

### Update Config (Admin)
```
PUT /api/v1/surge/config
```
**Request Body:**
```json
{
  "enabled": true,
  "multiplier": 1.5,
  "startHour": 19,
  "endHour": 21
}
```

---

## 🔒 GDPR Routes

### Export User Data
```
GET /api/v1/user/gdpr/export
```

### Delete Account
```
DELETE /api/v1/user/gdpr/delete
```

---

## 📋 Subscriptions Routes

### Create Subscription
```
POST /api/v1/subscriptions
```

### Get My Subscriptions
```
GET /api/v1/subscriptions/my
```

### Get Subscription
```
GET /api/v1/subscriptions/:id
```

### Pause Subscription
```
PUT /api/v1/subscriptions/:id/pause
```

### Resume Subscription
```
PUT /api/v1/subscriptions/:id/resume
```

### Cancel Subscription
```
PUT /api/v1/subscriptions/:id/cancel
```

---

## 📤 Upload Routes

### Upload Image
```
POST /api/v1/upload
```
**Request:** `multipart/form-data` with `image` field (max 5MB)

**Response:**
```json
{
  "message": "Image Uploaded Successfully",
  "image": "https://res.cloudinary.com/..."
}
```

---

## Health Check

```
GET /health
```
**Response:**
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

```
GET /ping
```
**Response:** `Pong`

---

## Error Response Format

All errors follow this structure:

```json
{
  "message": "Human readable error message"
}
```

**HTTP Status Codes:**
| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request (validation, business logic) |
| 401 | Unauthorized (no/invalid token) |
| 403 | Forbidden (insufficient role) |
| 404 | Not Found |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |