# SwadKart Edge Cases & Security Handling

## 🔐 Security Edge Cases

### 1. JWT Token Manipulation

**Scenario:** Attacker tries to modify JWT payload to escalate privileges.

```
Attack: Modify payload { "role": "user" } → { "role": "admin" }
```

**Defense:**
```javascript
// authMiddleware.js - NEVER trust decoded token payload alone
const decoded = jwt.verify(token, process.env.JWT_SECRET);
req.user = await User.findById(decoded.userId); // Verify from DB
// User role fetched from DB, not from token
// Token only contains userId, not role
```

**Result:** Modifying token has no effect. Role fetched from DB on every request.

---

### 2. NoSQL Injection (MongoDB)

**Scenario:** Attacker sends `{ "$gt": "" }` in request to bypass authentication.

```javascript
// Unsafe: User input directly in query
User.find({ email: req.body.email, password: hash }) // ❌

// Attack payload: { "email": { "$gt": "" } } → matches ALL users
```

**Defense:**
```javascript
// server.js - safeMongoSanitize middleware
const safeMongoSanitize = (req, res, next) => {
  const sanitize = (obj) => {
    if (Buffer.isBuffer(obj)) return;
    if (obj instanceof Object) {
      for (const key in obj) {
        if (/^\$/.test(key) || key.includes(".")) {
          delete obj[key]; // Remove $ operators and . field access
        } else {
          sanitize(obj[key]);
        }
      }
    }
  };
  ["body", "query", "params"].forEach((k) => {
    if (req[k]) sanitize(req[k]);
  });
  next();
};
app.use(safeMongoSanitize);
```

**Result:** `{"$gt": ""}` becomes `{}` — injected operator deleted.

---

### 3. Biometric Hash Validation

**Scenario:** Attacker replays old WebAuthn assertions or uses fake credentials.

**Defense (Registration):**
```javascript
// biometricController.js
const credentialPublicKey = Buffer.from(req.body.credentialPublicKey, "base64url");
const storedCredential = await User.findOne({
  _id: req.user._id,
  "biometricCredentials.credentialID": credentialID
});

// Validate counter (anti-replay)
if (parsedAuthData.authenticatorData.counter <= storedCredential.counter) {
  return res.status(400).json({ message: "Biometric replay detected" });
}
```

**Defense (Storage):**
```javascript
// biometricService.js (frontend)
// Credential ID stored in localStorage, NEVER the private key
// Private key never leaves the device's secure enclave (TPM/secure element)
```

---

### 4. Razorpay Webhook Spoofing

**Scenario:** Attacker sends fake payment.success webhook to mark unpaid order as paid.

**Defense:**
```javascript
// paymentController.js - razorpayWebhook
export const razorpayWebhook = async (req, res) => {
  const sig = req.headers["x-razorpay-signature"];
  const body = req.body; // RAW body (not parsed)

  // Cryptographically verify webhook authenticity
  const expectedSig = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (sig !== expectedSig) {
    return res.status(400).json({ message: "Invalid signature" });
  }

  // Only now process the event
  const event = JSON.parse(body);
  if (event.event === "payment.captured") {
    // Mark order as paid
  }
};
```

---

### 5. Order Ownership Bypass (Socket.io)

**Scenario:** User tries to subscribe to another user's order updates via Socket.io.

**Defense:**
```javascript
// server.js - Socket.io middleware
io.on("connection", (socket) => {
  // All socket connections require valid JWT
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  socket.user = decoded;
});

socket.on("joinOrder", async (id) => {
  const order = await Order.findById(id).select("user deliveryPartner").lean();

  const isOrderOwner = order.user.toString() === socket.user.userId;
  const isDriver = order.deliveryPartner?.toString() === socket.user.userId;
  const isPrivileged = userDoc.role === "admin" || userDoc.role === "restaurant_owner";

  if (!isOrderOwner && !isDriver && !isPrivileged) {
    console.warn(`🚫 Socket ${socket.id} denied access to order room ${id}`);
    return; // Don't join the room
  }
  socket.join(id);
});
```

---

### 6. CSRF Attack on Authenticated Session

**Scenario:** User logged into SwadKart visits malicious site that sends POST to `/api/v1/orders`.

**Defense:**
```javascript
// server.js - csrfProtection middleware
const csrfProtection = (req, res, next) => {
  // Bearer token clients (mobile apps, API clients) are exempt
  const hasBearerToken = req.headers.authorization?.startsWith("Bearer");
  if (hasBearerToken) return next();

  // Browser requests must have valid Origin or Referer
  const origin = req.headers.origin;
  const isValidOrigin = origin && allowedOrigins.includes(origin);

  // Exempt: webhooks, contact form, public GET
  if (csrfExemptPaths.some((path) => req.path.startsWith(path))) return next();

  if (!isValidOrigin) {
    return res.status(403).json({ message: "CSRF Blocked" });
  }
  next();
};
```

---

### 7. Rate Limiting Bypass

**Scenario:** Attacker uses multiple IPs to bypass rate limit.

**Defense:**
```javascript
// server.js - Behind trusted proxy (express trust proxy)
app.set("trust proxy", 1); // Vercel/Render adds X-Forwarded-For

// Rate limiter uses real IP from X-Forwarded-For header
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300, // per IP
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiting on auth endpoints
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10, // 10 attempts per 10 minutes
  message: "Too many attempts. Please try again after 10 minutes.",
});
app.use("/api/v1/users/login", authLimiter);
app.use("/api/v1/users/register", authLimiter);
app.use("/api/v1/users/verify-email", authLimiter);
```

---

### 8. OTP Brute Force

**Scenario:** Attacker tries all 000000 to 999999 combinations for OTP verification.

**Defense:**
```javascript
// authController.js
// 1. OTP expires in 10 minutes
const otpExpires = new Date(user.otpExpires);
if (Date.now() > otpExpires.getTime()) {
  return res.status(400).json({ message: "OTP expired. Request new one." });
}

// 2. OTP hash check (never store plain OTP)
const isValid = await bcrypt.compare(plainOtp, storedHash);

// 3. Wrong attempt counter
if (attempts >= 3) {
  return res.status(400).json({ message: "Too many attempts. Request new OTP." });
}
```

---

### 9. Password Hash Timing Attack

**Scenario:** Attacker measures response time to guess password character by character.

**Defense:**
```javascript
// userModel.js - Using bcrypt.compare (constant-time comparison)
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
  // bcrypt.compare is constant-time, not vulnerable to timing attacks
};
```

---

## 🐛 Performance & Functional Edge Cases

### 10. Cart Persistence (Offline PWA)

**Scenario:** User adds items to cart, goes offline, reopens app.

**Defense:**
```javascript
// redux/cartSlice.js
const cartSlice = createSlice({
  name: "cart",
  initialState: {
    cartItems: localStorage.getItem("cart")
      ? JSON.parse(localStorage.getItem("cart"))
      : [],
  },
  reducers: {
    addToCart: (state, action) => {
      state.cartItems.push(action.payload);
      localStorage.setItem("cart", JSON.stringify(state.cartItems));
    },
    removeFromCart: (state, action) => {
      state.cartItems = state.cartItems.filter((i) => i._id !== action.payload);
      localStorage.setItem("cart", JSON.stringify(state.cartItems));
    },
  },
});
// Cart synced to localStorage on every change
// Service worker caches app shell for offline
```

---

### 11. Order Duplicate Prevention

**Scenario:** User double-clicks "Place Order" button, two orders created.

**Defense (Frontend):**
```javascript
// pages/PlaceOrder.jsx
const [placing, setPlacing] = useState(false);
const handlePlaceOrder = async () => {
  if (placing) return;
  setPlacing(true);
  try {
    // API call
  } finally {
    setPlacing(false);
  }
};
```

**Defense (Backend):**
```javascript
// orderController.js
const addOrderItems = asyncHandler(async (req, res) => {
  // 1. Rate limit check (20 orders per 15 min per user)
  // 2. Fraud detection middleware
  // 3. Idempotency key (optional, for future)
  // 4. Atomic stock decrement (no race condition)
  const session = await mongoose.startSession();
  session.withTransaction(async () => {
    // Deduct stock atomically
    for (const item of req.body.orderItems) {
      const product = await Product.findOneAndUpdate(
        { _id: item.product, countInStock: { $gte: item.qty } },
        { $inc: { countInStock: -item.qty } },
        { session }
      );
      if (!product) {
        throw new Error(`Insufficient stock for ${item.name}`);
      }
    }
    // Create order
  });
});
```

---

### 12. Stock Race Condition

**Scenario:** Two users try to buy the last item simultaneously.

**Defense (Atomic Update):**
```javascript
// productController.js - toggleProductStock
const product = await Product.findOneAndUpdate(
  { _id: req.params.id, countInStock: { $gte: 1 } },
  [
    {
      $set: {
        isAvailable: {
          $not: "$isAvailable"
        },
        countInStock: { $subtract: ["$countInStock", 1] }
      }
    },
    { $set: { isAvailable: true, countInStock: 0 } }, // auto-disable if hits 0
    { $cond: { if: { $lte: ["$countInStock", 0] }, then: true, else: "$isAvailable" } }
  ]
);
// Only one request succeeds — atomic findAndModify
```

---

### 13. Coupon Concurrent Usage

**Scenario:** Same coupon applied by user twice in quick succession.

**Defense:**
```javascript
// couponController.js - validateCoupon
const coupon = await Coupon.findOne({ code: code.toUpperCase() });

if (coupon.usedBy.includes(userId)) {
  return res.status(400).json({ message: "Coupon already used by you" });
}

// Atomic: Use coupon in one atomic operation
await Coupon.updateOne(
  { _id: coupon._id, usedBy: { $ne: userId } },
  { $push: { usedBy: userId } }
);
// If race condition: second $push fails (user already added)
```

---

### 14. Redis Failure (Graceful Degradation)

**Scenario:** Redis goes down, cache operations fail.

**Defense:**
```javascript
// config/redis.js
import Redis from "ioredis";

// Primary: Redis Cloud
// Fallback: In-memory Map
let cacheClient;

try {
  if (process.env.REDIS_URL) {
    cacheClient = new Redis(process.env.REDIS_URL);
  } else {
    throw new Error("No REDIS_URL");
  }
} catch {
  console.warn("⚠️ Redis unavailable. Using in-memory cache.");
  // In-memory Map fallback
  cacheClient = new Map();
  cacheClient.ping = async () => {}; // No-op
  cacheClient.get = async (key) => cacheClient.get(key);
  cacheClient.set = async (key, val, ttl) => {
    cacheClient.set(key, val);
    if (ttl) setTimeout(() => cacheClient.delete(key), ttl * 1000);
    return "OK";
  };
  cacheClient.del = async (key) => cacheClient.delete(key);
}
```

**Result:** App continues working with degraded performance (no caching).

---

### 15. Socket.io Disconnect (Order Tracking)

**Scenario:** Driver mobile loses network while delivering. Customer sees frozen tracking.

**Defense:**
```javascript
// utils/socket.js
const socket = io(BASEURL, {
  transports: ["websocket", "polling"], // Fallback to polling
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10,
});

// Reconnection handler
socket.on("reconnect", () => {
  // Rejoin order room after reconnect
  socket.emit("joinOrder", currentOrderId);
});

// Server: Broadcast last known location on reconnect
socket.on("joinOrder", async (id) => {
  const order = await Order.findById(id).select("driverLocation").lean();
  if (order?.driverLocation) {
    socket.emit("driverLocationUpdate", order.driverLocation);
  }
});
```

---

### 16. Payment Gateway Timeout

**Scenario:** User clicks Pay, Razorpay opens, but network dies mid-payment.

**States:**
1. **Order created, payment pending** → Order exists with `isPaid: false`
2. **Razorpay order created** → Razorpay order ID stored in order
3. **User never returns** → Background job checks abandoned orders after 30 min

**Defense:**
```javascript
// paymentController.js - createRazorpayOrder
const razorpayOrder = await razorpay.orders.create({
  amount: amount * 100, // paise
  currency: "INR",
  receipt: orderId,
  notes: { swadkart_order_id: orderId }
});

// Store razorpay order ID in order.paymentResult
await Order.findByIdAndUpdate(orderId, {
  "paymentResult.id": razorpayOrder.id,
  "paymentResult.status": "pending"
});

// Background job (future): Check abandoned orders every hour
// If razorpay order status is "created" (not "paid") for > 30 min → cancel
```

---

### 17. Image Upload Failures

**Scenario:** User uploads image, Cloudinary fails or returns bad URL.

**Defense:**
```javascript
// utils/imageOptimizer.js
export const optimizeImageUrl = (url) => {
  if (!url) return null;

  // Already cloudinary
  if (url.includes("res.cloudinary.com")) {
    return url.split("upload")[0] + "upload/f_auto,q_auto,w_800" +
      url.split("upload")[1];
  }

  // Google storage
  if (url.includes("googleapis.com")) {
    return url + "&w=800&fm=webp";
  }

  // Placeholder
  if (!url.startsWith("http")) {
    return "https://placehold.co/600x400/1f2937/white?text=No+Image";
  }

  return url;
};

// Frontend onError fallback
<img src={product.image} onError={(e) => e.target.src = "/placeholder.jpg"} />
```

---

### 18. GDPR Data Export/Delete

**Scenario:** User requests all their data or account deletion.

**Defense:**
```javascript
// gdprController.js
export const exportUserData = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate("orders")
    .populate("notifications")
    .lean();

  // Remove sensitive fields
  delete user.password;
  delete user.otp;
  delete user.resetPasswordToken;

  // JSON export
  const exportData = {
    user,
    orders: user.orders,
    walletTransactions: user.walletTransactions,
    notifications: user.notifications,
    exportedAt: new Date().toISOString(),
  };

  res.setHeader("Content-Disposition", `attachment; filename="swadkart-data-${user.email}.json"`);
  res.json(exportData);
});

export const deleteUserAccount = asyncHandler(async (req, res) => {
  // Anonymize instead of delete (order history for legal/tax)
  await User.findByIdAndUpdate(req.user._id, {
    email: `deleted_${Date.now()}@anonymized.local`,
    name: "Deleted User",
    phone: "0000000000",
    password: "DELETED",
    isAdmin: false,
    walletBalance: 0,
    fcmToken: null,
    biometricCredentials: [],
    referralCode: null,
    // Keep: orders (for legal compliance), referralCode hash
  });

  res.json({ message: "Account anonymized per GDPR" });
});
```

---

### 19. Surge Pricing Transparency

**Scenario:** User confused why delivery fee is higher during peak hours.

**Defense:**
```javascript
// Frontend: PlaceOrder.jsx
// Show breakdown
{ surgePrice > 0 && (
  <div className="flex justify-between text-sm text-orange-400">
    <span>⚡ Surge Pricing ({surgeMultiplier}x)</span>
    <span>₹{surgePrice}</span>
  </div>
)}

{ tipAmount > 0 && (
  <div className="flex justify-between text-sm text-green-400">
    <span>💝 Driver Tip</span>
    <span>₹{tipAmount}</span>
  </div>
)}
```

---

### 20. Delivery OTP Edge Cases

**Scenario:**
- Customer gives wrong OTP 5 times
- Driver tries to mark delivered without OTP
- OTP expires before delivery

**Defense:**
```javascript
// deliveryController.js - updateOrderToDelivered
// 1. Attempt limiting
if (order.otpAttempts >= 5) {
  return res.status(429).json({
    message: "Too many OTP attempts. Contact support.",
  });
}

// 2. OTP verification
if (order.deliveryOTP !== Number(otp)) {
  order.otpAttempts += 1;
  await order.save();
  const remaining = 5 - order.otpAttempts;
  return res.status(400).json({
    message: `❌ Incorrect OTP! ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
  });
}

// 3. On success: reset attempts
order.otpAttempts = 0;

// 4. OTP never expires (once generated, valid until delivery)
// Driver can request new OTP from admin if truly needed
```

---

## 🧪 Testing Checklist

| Test Case | Expected Behavior |
|-----------|------------------|
| Login with wrong password 3x | Rate limited, email notification sent |
| Register with existing email | Error: "Email already exists" |
| Access admin route as user | 403 Forbidden |
| Access order room of another user (socket) | Connection denied |
| Modify JWT role to admin | No effect, role from DB used |
| Send `{"$gt": ""}` as email | NoSQL injection blocked |
| Double-click place order button | Only 1 order created |
| Apply same coupon twice | Second attempt fails |
| Go offline during checkout | Order queued in localStorage |
| Upload non-image file | Multer rejects with error |
| Verify Razorpay webhook with wrong signature | 400 Bad Request |
| Request data export | JSON file with all user data |
| Request account deletion | Account anonymized (not deleted) |