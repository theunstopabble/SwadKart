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
**Headers:** `Authorization: Bearer <token>` (optional — enables auth-required tools)

**Request Body:**
```json
{
  "message": "What are the best burgers nearby?",
  "context": { "lastOrder": "..." }
}
```
**Request Options:** `multipart/form-data` with up to 3 attachments (5MB each)

**Response:** `200 OK`
```json
{
  "reply": "Here are some great burger options...",
  "intent": "recommendation",
  "language": "en",
  "toolsUsed": []
}
```

### Chat with AI Genie (Streaming)
```
POST /api/v1/chat/stream
```
Same request body as above. Returns Server-Sent Events (SSE).

---

## 🤖 Chatbot Action Tools (Function Calling)

The AI Genie uses **Groq function-calling** to execute actions on behalf of the user during a conversation. Tools are conditionally included based on authentication status via the **Tool Registry**.

### Tool Registry Behavior

| Auth Status | Available Tools |
|-------------|----------------|
| Unauthenticated | `faq_support` |
| Authenticated | `faq_support`, `get_order_status`, `cancel_order`, `list_coupons`, `get_delivery_eta`, `reorder_last` |

### Multi-Tool Pipeline

The chat pipeline supports **multiple sequential tool calls** in a single conversation turn. The LLM may invoke one tool, receive its result, then invoke another before generating the final response.

```
User message → LLM → tool_call(A) → execute(A) → LLM → tool_call(B) → execute(B) → LLM → final text
```

### Tool Response Format

All tools return a consistent structure:

**Success:**
```json
{ "success": true, "data": { ... } }
```

**Failure:**
```json
{ "success": false, "reason": "error_code", "message": "Human-readable explanation" }
```

---

### `get_order_status` — Get Order Status

**Auth:** Required

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| orderId | string | ✅ | MongoDB ObjectId of the order |

**Success Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "664a...",
    "status": "Preparing",
    "placedAt": "2026-05-10T12:00:00Z",
    "estimatedDelivery": "2026-05-10T12:45:00Z",
    "items": [{ "name": "Veg Burger", "qty": 2 }]
  }
}
```

**Error Codes:** `not_found`, `unauthorized`

---

### `cancel_order` — Cancel Order

**Auth:** Required

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| orderId | string | ✅ | MongoDB ObjectId of the order |

**Business Rules:**
- Order must be within **5-minute cancellation window** from placement
- Order must be in `Placed` status
- Uses atomic `findOneAndUpdate` to prevent race conditions

**Success Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "664a...",
    "previousStatus": "Placed",
    "newStatus": "Cancelled",
    "refundInitiated": true
  }
}
```

**Error Codes:** `not_found`, `unauthorized`, `window_expired`, `already_cancelled`, `not_cancellable`

---

### `list_coupons` — List/Apply Coupons

**Auth:** Required

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| action | string | ✅ | `"list"` or `"apply"` |
| couponCode | string | ❌ | Required when action is `"apply"` |
| orderValue | number | ❌ | Cart value for validation |

**Success Response (list):**
```json
{
  "success": true,
  "data": {
    "coupons": [
      { "code": "FESTIVE50", "discount": 50, "minOrder": 200, "maxDiscount": 100, "expiresAt": "..." }
    ]
  }
}
```

**Error Codes:** `no_coupons`, `invalid_coupon`, `min_order_not_met`, `already_used`

---

### `get_delivery_eta` — Get Delivery ETA

**Auth:** Required

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| orderId | string | ✅ | MongoDB ObjectId of the order |

**Success Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "664a...",
    "estimatedMinutes": 25,
    "status": "Out for Delivery",
    "driverName": "Rahul",
    "lastUpdated": "2026-05-10T12:30:00Z"
  }
}
```

**Error Codes:** `not_found`, `unauthorized`, `no_eta_available`

---

### `faq_support` — FAQ Instant Answers

**Auth:** Not required

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| topic | string (enum) | ✅ | One of: `helpline`, `refund_policy`, `delivery_areas`, `payment_methods`, `order_issues`, `account_help` |

**Success Response:**
```json
{
  "success": true,
  "data": {
    "topic": "refund_policy",
    "answer": "Refunds are processed within 5-7 business days for prepaid orders..."
  }
}
```

**Error Codes:** `invalid_topic`

**Performance:** Synchronous, no DB calls, sub-100ms response time.

---

### `reorder_last` — Repeat Last Order

**Auth:** Required

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| confirm | boolean | ❌ | If true, places the order. If false/omitted, returns preview. |

**Success Response (preview):**
```json
{
  "success": true,
  "data": {
    "preview": true,
    "items": [{ "name": "Paneer Tikka", "qty": 1, "price": 220 }],
    "estimatedTotal": 270,
    "restaurant": "Spice Garden"
  }
}
```

**Error Codes:** `no_previous_order`, `items_unavailable`, `restaurant_closed`

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

## 🧮 Enterprise Calculator Routes

### 🍖 Food Cost Calculator (`/cost-calculator`)

#### Get Item Cost Analysis
```
GET /api/v1/cost-calculator/item/:productId
```
**Auth:** `restaurant_owner`, `admin`
**Response:**
```json
{
  "productId": "...",
  "productName": "Margherita Pizza",
  "ingredientCost": 85.50,
  "preparationCost": 15.00,
  "packagingCost": 5.00,
  "totalCost": 105.50,
  "foodCostPercentage": 30,
  "targetMargin": 25,
  "suggestedPrice": 175.00,
  "currentPrice": 149,
  "profitAtCurrentPrice": 43.50,
  "profitMarginAtCurrent": 29.19
}
```

#### Update Item Cost Data
```
PUT /api/v1/cost-calculator/item/:productId
```
**Auth:** `restaurant_owner`, `admin`
**Request:**
```json
{
  "ingredients": [
    { "name": "Mozzarella", "quantity": 200, "unit": "g", "unitCost": 2.5 },
    { "name": "Tomato Sauce", "quantity": 100, "unit": "ml", "unitCost": 0.8 }
  ],
  "foodCostPercentage": 28,
  "preparationCost": 15,
  "packagingCost": 5,
  "marginTarget": 30
}
```

#### Get Menu Cost Analysis
```
GET /api/v1/cost-calculator/menu?restaurantId=...
```
**Auth:** `restaurant_owner`, `admin`
**Response:**
```json
{
  "analysis": [{ "productId": "...", "name": "...", "status": "healthy", ... }],
  "summary": { "total": 25, "healthy": 18, "low": 3, "underpriced": 2, "overpriced": 2 }
}
```
**Status values:** `healthy`, `low`, `underpriced`, `overpriced`

#### Batch Cost Calculator
```
POST /api/v1/cost-calculator/batch
```
**Auth:** `restaurant_owner`, `admin`
**Request:**
```json
{
  "items": [
    { "productId": "...", "qty": 2 },
    { "productId": "...", "qty": 1 }
  ]
}
```
**Response:**
```json
{
  "items": [...],
  "totalIngredientCost": 450.00,
  "totalPreparationCost": 45.00,
  "totalPackagingCost": 15.00,
  "grandTotalCost": 510.00
}
```

---

### 💰 Pricing & Commission Calculator (`/pricing-calculator`)

#### Calculate Commission for Order
```
GET /api/v1/pricing-calculator/commission/:orderId
```
**Auth:** `admin`, `restaurant_owner`
**Response:**
```json
{
  "orderId": "...",
  "platformFeeRate": 15,
  "platformCommission": 37.50,
  "restaurantPayout": 212.50,
  "deliveryFeeCover": 40,
  "surgeRevenue": 0,
  "tipAmount": 20
}
```

#### Get Commission Breakdown (All Restaurants)
```
GET /api/v1/pricing-calculator/commission-breakdown?restaurantId=...&startDate=...&endDate=...
```
**Auth:** `admin`
**Response:**
```json
[
  {
    "restaurantName": "Pizza Palace",
    "totalOrders": 150,
    "grossRevenue": 45000,
    "platformCommission": 6750,
    "restaurantPayout": 38250
  }
]
```

#### Calculate Pricing Tiers
```
POST /api/v1/pricing-calculator/pricing-tiers
```
**Auth:** `restaurant_owner`, `admin`
**Request:**
```json
{ "basePrice": 199, "costPrice": 80, "surgeMultiplier": 1.5 }
```
**Response:**
```json
{
  "basePrice": 199,
  "costPrice": 80,
  "currentProfit": 119,
  "currentMargin": 59.80,
  "recommendedPrice": 106.67,
  "tiers": [
    { "name": "Minimum (Cost + 10%)", "price": 88, "margin": 9.09 },
    { "name": "Standard (25% margin)", "price": 106.67, "margin": 25 },
    { "name": "Premium (35% margin)", "price": 123.08, "margin": 35 },
    { "name": "With Surge (1.5x)", "price": 298.50, "margin": 73.20 }
  ]
}
```

#### Get Market Pricing Analysis
```
GET /api/v1/pricing-calculator/market-pricing?restaurantId=...&category=...
```
**Auth:** `admin`, `restaurant_owner`
**Response:**
```json
{
  "categoryAverages": [
    { "category": "Pizza", "count": 25, "average": 185, "median": 175, "min": 99, "max": 450 }
  ],
  "priceDistribution": {
    "₹0-100": 12, "₹101-200": 35, "₹201-300": 28, "₹301-500": 15, "₹500+": 5
  }
}
```

---

### 🚀 Delivery Fee Calculator (`/delivery-calculator`)

#### Calculate Delivery Fee
```
POST /api/v1/delivery-calculator/fee
```
**Auth:** `user`, `admin`
**Request:**
```json
{
  "distanceKm": 3.5,
  "isSurgeActive": true,
  "hasSwadPass": false,
  "orderSubtotal": 250,
  "baseFee": 40
}
```
**Response:**
```json
{
  "distanceKm": 3.5,
  "baseFee": 40,
  "distanceSurcharge": 28,
  "surgeMultiplier": 1.3,
  "surgeAmount": 22.40,
  "totalDeliveryFee": 90.40,
  "freeDelivery": false,
  "freeDeliveryThreshold": 500
}
```

#### Calculate Route Fee
```
POST /api/v1/delivery-calculator/route
```
**Auth:** `delivery_partner`, `admin`
**Request:**
```json
{
  "pickupLat": 28.6139,
  "pickupLng": 77.2090,
  "dropLat": 28.6304,
  "dropLng": 77.2177,
  "vehicleType": "scooter"
}
```
**Response:**
```json
{
  "distanceKm": 3.21,
  "estimatedTravelMinutes": 7,
  "feeBreakdown": { "baseFee": 15, "distanceFee": 16.05, "timeFee": 7 },
  "totalFee": 38.05,
  "estimatedArrival": "2026-05-10T...",
  "etaMinutes": 12
}
```
**Vehicle types:** `bicycle`, `scooter`, `bike`

#### Get Delivery Earnings Projection
```
GET /api/v1/delivery-calculator/earnings?driverId=...
```
**Auth:** `delivery_partner`, `admin`
**Response:**
```json
{
  "totalRecentOrders": 87,
  "avgDeliveryFee": 35.50,
  "avgDistanceKm": 4.2,
  "ordersPerDay": 2.9,
  "weeklyProjection": 738.15,
  "monthProjection": 3092.43
}
```

---

### 🪙 Loyalty & Reward Calculator (`/rewards-calculator`)

#### Get Loyalty Tiers
```
GET /api/v1/rewards-calculator/tiers
```
**Auth:** Public
**Response:**
```json
[
  { "name": "Bronze", "minCoins": 0, "maxCoins": 500, "redeemRate": 0.08, "bonusEarning": 1 },
  { "name": "Silver", "minCoins": 500, "maxCoins": 2000, "redeemRate": 0.09, "bonusEarning": 1.5 },
  { "name": "Gold", "minCoins": 2000, "maxCoins": 5000, "redeemRate": 0.10, "bonusEarning": 2 },
  { "name": "Platinum", "minCoins": 5000, "maxCoins": null, "redeemRate": 0.12, "bonusEarning": 3 }
]
```

#### Calculate Coin Earnings
```
POST /api/v1/rewards-calculator/earn
```
**Auth:** Protected
**Request:**
```json
{ "orderAmount": 350, "userId": "..." }
```
**Response:**
```json
{
  "orderAmount": 350,
  "baseCoins": 35,
  "earningRate": 1.5,
  "earnedCoins": 52,
  "tierName": "Silver",
  "coinsValueRupees": 5.20,
  "message": "🎉 You've earned 52 coins (1.5x multiplier for Silver tier)!"
}
```

#### Calculate Coin Redemption
```
POST /api/v1/rewards-calculator/redeem
```
**Auth:** Protected
**Request:**
```json
{ "coins": 500, "orderAmount": 350 }
```
**Response:**
```json
{
  "coinsRedeemed": 500,
  "coinsValueRupees": 50,
  "orderAmount": 350,
  "discountPercent": 14.29,
  "finalOrderAmount": 300,
  "platformFee": 45,
  "restaurantPayout": 255,
  "coinsRemainingAfter": 4500
}
```
**Constraints:** Coins must be multiple of 100. Max 50% discount per order.

#### Get Referral Reward Info
```
GET /api/v1/rewards-calculator/referral?referrerCode=SWAD123
```
**Response:**
```json
{
  "referrerName": "Rahul",
  "referrerTier": "Gold",
  "referrerRewardCoins": 400,
  "referrerRewardValue": 40,
  "refereeRewardCoins": 100,
  "refereeRewardValue": 10,
  "referrerBonusMultiplier": 2
}
```

#### Get Reward Breakdown
```
GET /api/v1/rewards-calculator/breakdown
```
**Auth:** Protected
**Response:**
```json
{
  "currentCoins": 2450,
  "referralCode": "SWAD123",
  "totalCoinsEarned": 3500,
  "totalCoinsRedeemed": 1050,
  "totalOrderValue": 35000,
  "recentSpent30Days": 8500,
  "projectedMonthlyCoins": 850,
  "coinTransactions": [...]
}
```

---

### 📊 Analytics & Revenue Forecast (`/analytics-forecast`)

#### Revenue Projection
```
GET /api/v1/analytics-forecast/revenue-projection?days=30
```
**Auth:** `admin`, `restaurant_owner`
**Response:**
```json
{
  "period": "30 days",
  "totalRevenue": 125000,
  "totalOrders": 650,
  "avgOrderValue": 192.31,
  "avgDailyRevenue": 4166.67,
  "weeklyProjection": 29166.69,
  "monthlyProjection": 125000.10,
  "projected7Days": [
    { "date": "2026-05-11", "projectedRevenue": 4500, "confidence": "high" },
    ...
  ]
}
```
**Confidence levels:** `high` (3 days), `medium` (5 days), `low` (7 days)

#### Order Volume Forecast
```
GET /api/v1/analytics-forecast/order-forecast?days=30
```
**Auth:** `admin`, `restaurant_owner`
**Response:**
```json
{
  "hourlyVolume": [{ "hour": 12, "orders": 45, "avgValue": 210 }],
  "dayVolume": [{ "day": "Mon", "orders": 85, "revenue": 17000 }],
  "peakHours": [12, 13, 19, 20, 21],
  "offPeakHours": [3, 4, 5, 6],
  "avgDailyOrders": 21.67,
  "projectedNext7Days": 152,
  "projectedNext30Days": 650
}
```

#### Demand Analytics
```
GET /api/v1/analytics-forecast/demand?days=30
```
**Auth:** `admin`, `restaurant_owner`
**Response:**
```json
{
  "period": "30 days",
  "topProducts": [
    { "rank": 1, "productId": "...", "name": "Margherita", "quantitySold": 320, "revenue": 47680 }
  ],
  "categoryDemand": [{ "category": "Pizza", "quantitySold": 1200, "revenue": 216000 }],
  "summary": { "totalProducts": 45, "fastMoving": 12, "slowMoving": 8 }
}
```

#### Profit & Loss Projection
```
GET /api/v1/analytics-forecast/profit-loss?days=30
```
**Auth:** `admin`
**Response:**
```json
{
  "grossRevenue": 125000,
  "totalRevenue": 118500,
  "deliveryFeesCollected": 18200,
  "tipsCollected": 6500,
  "discountsGiven": 8500,
  "platformCommission": 19500,
  "restaurantPayouts": 110500,
  "netPlatformRevenue": 30200,
  "netMarginPercent": 25.49
}
```

---

### 📦 Inventory Forecasting (`/inventory-forecast`)

#### Get Inventory Forecast
```
GET /api/v1/inventory-forecast/forecast?restaurantId=...&days=7
```
**Auth:** `restaurant_owner`, `admin`
**Response:**
```json
{
  "forecasts": [
    {
      "productId": "...",
      "name": "Paneer Tikka",
      "currentStock": 8,
      "avgDailyDemand": 4.5,
      "daysUntilStockout": 1,
      "restockUrgent": true,
      "suggestedReorderQty": 55,
      "status": "critical"
    }
  ],
  "summary": { "totalProducts": 45, "outOfStock": 2, "critical": 5, "low": 8, "healthy": 30 }
}
```
**Status values:** `healthy`, `low`, `critical`, `out_of_stock`

#### Get Reorder Recommendations
```
GET /api/v1/inventory-forecast/reorder?restaurantId=...&threshold=5
```
**Auth:** `restaurant_owner`, `admin`
**Response:**
```json
{
  "recommendations": [
    {
      "productId": "...",
      "name": "Tandoori Roti",
      "currentStock": 15,
      "dailyDemand": 3.2,
      "daysLeft": 4,
      "suggestedReorderQty": 45,
      "lastRestocked": "2026-05-01"
    }
  ],
  "total": 8,
  "thresholdDays": 5
}
```

#### Waste Analysis
```
GET /api/v1/inventory-forecast/waste?restaurantId=...&days=30
```
**Auth:** `restaurant_owner`, `admin`
**Response:**
```json
{
  "period": "30 days",
  "wasteByCategory": [
    { "category": "Salads", "estimatedWastePercent": 8.5, "products": 5 }
  ],
  "avgWasteRate": 3.2
}
```

---

### 💵 Driver Earnings Calculator (`/driver-earnings`)

#### Calculate Earnings
```
POST /api/v1/driver-earnings/calculate
```
**Auth:** `delivery_partner`, `admin`
**Request:**
```json
{
  "distanceKm": 5.5,
  "orderValue": 450,
  "isPeakHour": true,
  "isSurgeActive": false,
  "vehicleType": "scooter"
}
```
**Response:**
```json
{
  "vehicleType": "scooter",
  "breakdown": {
    "base": 15,
    "distancePay": 27.50,
    "tipShare": 22.50,
    "surgeBonus": 0,
    "peakHourBonus": 20,
    "promotionBonus": 0,
    "subtotal": 85
  },
  "platformCut": 8.50,
  "grossEarnings": 85,
  "netEarnings": 76.50,
  "effectiveRatePerKm": 13.91
}
```

#### Get Payout History
```
GET /api/v1/driver-earnings/payout-history
```
**Auth:** `delivery_partner`, `admin`
**Response:**
```json
{
  "driverId": "...",
  "last30Days": {
    "daysWorked": 24,
    "totalDeliveries": 68,
    "totalEarnings": 2450,
    "avgEarningsPerDay": 102.08
  }
}
```

#### Get Incentives
```
GET /api/v1/driver-earnings/incentives
```
**Auth:** `delivery_partner`, `admin`
**Response:**
```json
{
  "last30Days": { "deliveries": 68, "totalEarnings": 2450 },
  "incentiveTiers": [
    { "deliveries": 30, "bonus": 500, "achieved": true },
    { "deliveries": 50, "bonus": 1000, "achieved": true },
    { "deliveries": 100, "bonus": 2500, "achieved": false }
  ],
  "nextMilestone": { "deliveries": 100, "bonus": 2500, "remaining": 32 },
  "weeklyTarget": { "deliveries": 25, "bonus": 750 },
  "weeklyProgress": 22
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