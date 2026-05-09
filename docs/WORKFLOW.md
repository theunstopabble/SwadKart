# SwadKart User Workflows

## Complete User Journey (Happy Path)

```mermaid
flowchart TD
    A["🚀 Open App<br/>(PWA Install if first time)"] --> B{Have Account?}

    B -->|No| C["📝 Register<br/>OTP Verification<br/>Email Confirmation"]
    C --> D["🔐 Set Password<br/>Biometric Setup<br/>(Optional)"]
    D --> E["🛒 Login"]
    B -->|Yes| E

    E --> F["✅ Auth Success<br/>JWT Cookie Set<br/>Socket.io Connected"]
    F --> G["🏠 Home Page<br/>Restaurant List<br/>(Cached 5min)"]

    G --> H["🍽️ Browse Menu<br/>Filter by Category<br/>AI Recommendations"]
    H --> I["🛒 Add to Cart<br/>Select Variants<br/>Add Extras"]

    I --> J{More Items?}
    J -->|Yes| H
    J -->|No| K["🛡️ Apply Coupon<br/>Validate Coupon API<br/>Show Savings"]

    K --> L["📍 Shipping Address<br/>Geolocation Auto-Fill<br/>Save Address"]

    L --> M["💳 Payment"]
    M --> M1["💰 Wallet (SwadCoins)"]
    M --> M2["💳 Razorpay (Card/UPI/Wallet)"]
    M --> M3["💵 COD (Cash on Delivery)"]

    M1 --> N["✅ Order Created"]
    M2 --> N
    M3 --> N

    N --> O["📊 Order Status Flow"]
    O --> O1["📝 Placed"]
    O1 --> O2["🔥 Preparing"]
    O2 --> O3["✅ Ready"]
    O3 --> O4["🛵 Out for Delivery"]
    O4 --> O5["🎉 Delivered"]

    O5 --> P["⭐ Rate & Review<br/>Earn SwadCoins<br/>Gamification Badges"]
    P --> Q["🎁 Refer Friends<br/>Share Code<br/>Both get ₹50"]

    N --> R["❌ Order Cancel"]
    R --> R1[Refund Initiated<br/> wallet credited]
```

## Restaurant Owner Workflow

```mermaid
flowchart LR
    A["🏪 Register as Owner<br/>Admin Approval"] --> B["📋 Dashboard<br/>Orders + Analytics"]
    B --> C["🍔 Menu Management<br/>Add/Edit/Price Items"]
    C --> D["✅ Toggle Stock<br/>Enable/Disable Items"]
    D --> E["📦 Inventory Alerts<br/>Low Stock Warnings"]
    E --> F["💰 Payout Requests<br/>View Earnings<br/>Request Withdrawal"]
    F --> B

    G["📋 New Order"] --> H{"Accept?"}
    H -->|Yes| I["🔥 Preparing<br/>Update Status"]
    H -->|No| J["❌ Reject<br/>Admin Reassign"]
    I --> K["✅ Mark Ready<br/>Waiting for Driver"]
    K --> L["🚚 Driver Assigned<br/>OTP Generated"]
    L --> M["📍 Live Tracking<br/>Watch Driver on Map"]
    M --> N["✅ Delivered<br/>Commission Credited"]
    N --> B
```

## Delivery Partner Workflow

```mermaid
flowchart TD
    A["🚚 Apply as Partner<br/>Admin Verification"] --> B["📱 Login to App<br/>Dashboard"]

    B --> C{New Orders?}
    C -->|Yes| D["📍 Accept Task<br/>View Customer Address"]
    C -->|No| B

    D --> E["🛵 Pick Up<br/>Navigate to Restaurant"]
    E --> F["🔢 OTP from Customer<br/>Verify Order"]

    F --> G["📍 Deliver<br/>OTP at Doorstep<br/>5 attempts max"]
    G --> H["✅ Delivered<br/>Earnings Credited<br/>Available for Next"]

    G --> I["❌ OTP Failed<br/>Contact Support<br/>3 attempts left"]

    H --> J{"More Orders?"}
    J -->|Yes| C
    J -->|No| K["🆘 SOS Button<br/>Emergency Alert<br/>Admin Notified"]
    K --> B

    I --> B
```

## Admin Workflow

```mermaid
flowchart TD
    A["👑 Admin Dashboard<br/>Overview + Stats"] --> B["🏪 Manage Restaurants<br/>Approve / Verify Shops"]
    B --> B1["Add Real Shop<br/>Create Dummy Data<br/>Toggle Status"]
    B1 --> B

    A --> C["🍔 Manage Menu<br/>Add Items<br/>Toggle Stock"]
    C --> C1["Bulk Restock<br/>Inventory Alerts"]
    C1 --> C

    A --> D["👥 Manage Users<br/>Delivery Partners<br/>Restaurant Owners<br/>Customers"]
    D --> D1["Ban/Unban<br/>Adjust Coins<br/>View Activity"]
    D1 --> D

    A --> E["🎫 Manage Coupons<br/>Create Promo<br/>Toggle Active<br/>View Usage"]
    E --> E1["Set Expiry<br/>Set Max Discount<br/>Min Order Value"]
    E1 --> E

    A --> F["📦 Manage Orders<br/>Assign Driver<br/>Handle Complaints"]
    F --> F1["View on Map<br/>Contact Partner<br/>Cancel/Refund"]
    F1 --> F

    A --> G["💰 Payouts<br/>View Earnings<br/>Approve Withdrawals"]
    G --> G1["Mark Paid<br/>Bank Transfer"]
    G1 --> G

    A --> H["🔥 Analytics<br/>Sales Trends<br/>Heatmap<br/>Leaderboard"]
```

## Edge Cases & Handling

### 1. Payment Failure

```mermaid
flowchart TD
    A["User clicks Pay"] --> B{Razorpay Response}
    B -->|Success| C["✅ Order Created"]
    B -->|Failed| D["❌ Show Error<br/>Don't create order"]
    D --> E["Retry Payment?<br/>Order still in cart"]
    E -->|Yes| A
    E -->|No| F["Clear Cart"]

    B -->|Network Error| G["Timeout<br/>Check order status"]
    G --> H{Order Created?}
    H -->|Yes| C
    H -->|No| I["Retry or Clear"]
```

### 2. Stock Out (Out of Stock)

```mermaid
flowchart TD
    A["User adds item to cart"] --> B[Backend check: countInStock]
    B --> C{Stock available?}
    C -->|Yes| D["✅ Added to Cart"]
    C -->|No| E["❌ Show: Out of Stock<br/>Disable Add button"]
    E --> F["Suggest Similar Items<br/>Show alternatives"]

    D --> G["Proceed to Checkout"] --> H["Final Stock Re-check"]
    H --> I{Stock Changed?}
    I -->|No| J["Create Order"]
    I -->|Yes (stock=0)| K["❌ Item removed<br/>Show toast notification<br/>Cart updated"]
    K --> L["Continue Checkout<br/>Without item"]
```

### 3. Offline PWA Flow

```mermaid
flowchart TD
    A["User offline"] --> B["PWA serves cached data"]
    B --> C["View cached restaurants<br/>Browse cached menu"]
    C --> D["Add to Cart<br/>(stored in IndexedDB)"]
    D --> E["View cached orders"]

    A --> F["User tries to order"]
    F --> G["❌ Show: Offline<br/>Order queued locally"]
    G --> H["Background Sync:<br/>When online, submit order"]
    H --> I["✅ Order submitted<br/>User notified"]
```

### 4. Concurrent Coupon Usage

```mermaid
flowchart TD
    A["User A applies COUPON50"] --> B["API: Validate Coupon"]
    B --> C["Check: usedBy.includes(userId)?"]
    C -->|No| D["✅ Valid<br/>Apply 50% off"]
    D --> E["Add userId to usedBy"]
    E --> F["Concurrent: User B<br/>also applies COUPON50"]

    F --> G["Check: usedBy.includes(UserB)?"]
    G -->|No| H["✅ Valid<br/>Apply 50% off"]
    G -->|Yes| I["❌ Already Used<br/>Show error"]

    D --> J["Concurrent: User A<br/>tries same coupon again"]
    J --> K["Check: usedBy.includes(UserA)?"]
    K -->|Yes| L["❌ Already Used"]
```

### 5. Order Cancellation (by user)

```mermaid
flowchart TD
    A["User requests cancel"] --> B{Current Status?}

    B -->|"Placed"| C["✅ Cancel allowed<br/>Full refund to wallet"]
    B -->|"Preparing"| D["⚠️ Cancel allowed<br/>20% cancellation fee"]
    B -->|"Ready"| E["❌ Cannot cancel<br/>Driver already assigned"]
    B -->|"Out for Delivery"| F["❌ Cannot cancel<br/>Driver en route"]
    B -->|"Delivered"| G["❌ Cannot cancel<br/>Order completed"]

    C --> H["✅ Cancelled<br/>Wallet credited"]
    D --> H
    E --> I["❌ Show: Cannot cancel<br/>Driver assigned"]
    F --> I
    G --> J["✅ Contact support<br/>for refund request"]
```

### 6. Biometric Auth Flow

```mermaid
flowchart TD
    A["User logs in (password)"] --> B["Profile → Enable Fingerprint"]
    B --> C["WebAuthn: navigator.credentials.create<br/>Generate credential"]
    C --> D["Store credential in browser<br/>Send publicKey to server"]
    D --> E["Server: Store credentialID<br/>+ credentialPublicKey<br/>Set isBiometricEnabled=true"]

    E --> F["App Lock: User reopens app"]
    F --> G["App Lock Screen shown<br/>Biometric prompt"]
    G --> H["WebAuthn: navigator.credentials.get"]
    H --> I["Server: Verify assertion<br/>Challenge validated"]
    I -->|Valid| J["✅ App Unlocked"]
    I -->|Invalid| K["❌ Auth Failed<br/>Try again / Password fallback"]
```

### 7. Surge Pricing Flow

```mermaid
flowchart TD
    A["User reaches checkout"] --> B["Backend: GET /surge/status"]
    B --> C{Current surge active?}
    C -->|No| D["Standard delivery fee"]
    C -->|Yes| E["Calculate: baseFee * surgeMultiplier"]
    E --> F["Show surge breakdown<br/>Transparent pricing"]
    F --> G["User confirms payment<br/>Total includes surge"]
    G --> H["Order created with<br/>surgePrice field"]
```

### 8. Group Order Flow

```mermaid
flowchart TD
    A["User A: Create Group Order"] --> B["Get shareable link<br/>Send to friends"]
    B --> C["Friends join via link"]
    C --> D["Everyone adds items<br/>to shared cart"]

    D --> E["Host sees everyone's items<br/>Calculate split"]
    E --> F["One person pays entire bill<br/>OR split equally<br/>OR custom split"]

    F --> G["Order created<br/>Restaurant sees single order<br/>with all items"]
    G --> H["Delivery to host's address<br/>Host distributes items"]
```

### 9. SwadPass Subscription Flow

```mermaid
flowchart TD
    A["User opens SwadPass page"] --> B["Choose Plan: Monthly / Yearly"]
    B --> C["Razorpay checkout<br/>Payment"]
    C --> D{Success?}
    D -->|No| E["❌ Payment failed<br/>No subscription"]
    D -->|Yes| F["✅ Subscribe<br/>hasSwadPass=true<br/>swadPassExpiry=date"]
    F --> G["Enjoy Perks:<br/>• Free delivery on all orders<br/>• 10% extra SwadCoins<br/>• Priority support<br/>• Exclusive deals"]
```

### 10. Wallet + Refund Flow

```mermaid
flowchart TD
    A["Order cancelled/refunded"] --> B["Calculate refund amount"]
    B --> C{Cancelled before preparing?}
    C -->|Yes| D["100% refund to wallet"]
    C -->|No| E["20% cancellation fee deducted"]
    E --> D

    D --> F["Wallet credited<br/>Transaction logged<br/>SwadCoins earned?"]
    F --> G["Transaction history updated"]
    G --> H["User sees +₹amount<br/>in wallet balance"]
```

## Error Handling Matrix

| Scenario | Backend Response | Frontend Action |
|----------|-----------------|----------------|
| Invalid coupon | `400: Coupon not found or expired` | Show error, keep cart |
| Out of stock | `400: Item out of stock` | Remove from cart, show alternatives |
| Payment failed | `400: Payment verification failed` | Show retry option |
| Unauthorized | `401: Not authorized` | Redirect to login |
| Rate limited | `429: Too many requests` | Show cooldown message |
| Server error | `500: Server error` | Show "Try again later" |
| No delivery partner | `400: No partner available` | Queue order, notify when assigned |
| Order already delivered | `400: Cannot modify delivered order` | Disable cancel button |
| Biometric failed | `401: Biometric verification failed` | Password fallback |
| Socket disconnect | Socket emits `disconnect` | Show offline banner |
| Redis down | Fallback to in-memory Map | App works normally |