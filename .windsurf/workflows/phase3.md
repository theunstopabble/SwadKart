---
description: Enterprise Phase 3 — RBAC, Scheduling & Push Notifications
---

# Phase 3 Implementation Workflow

## Scope
- FEAT-6:  RBAC + Admin Middleware Hardening
- FEAT-7:  Menu Item Availability Scheduling
- FEAT-20: Push Notification Engine (FCM + WebSocket hybrid)

## Step 1 — RBAC Middleware Hardening
// turbo
1. Review existing roleMiddleware.js and authMiddleware.js
2. Create granular permission checks (canViewOrders, canManageProducts, canManageRestaurants, canManageUsers, canManagePayouts, canManageAnalytics)
3. Update all controllers to use granular checks instead of just `role === "admin"`
4. Add middleware to new routes (payouts, analytics, inventory)
5. Verify with node --check

## Step 2 — Menu Item Availability Scheduling
1. Update `productModel.js` — add `scheduleEnabled: Boolean`, `schedule: { days: [String], startTime: String, endTime: String }`
2. Update `orderController.js` — validate product is available NOW before allowing checkout (respect schedule)
3. Update `productController.js` — CRUD for schedule fields
4. Frontend: Add schedule toggle in product edit form
5. Verify syntax

## Step 3 — Push Notification Engine
1. Create `notificationModel.js` — stores notification history per user
2. Create `notificationController.js` — APIs to send, list, mark-read
3. Integrate FCM (Firebase Cloud Messaging) sending in critical flows:
   - Order placed → notify restaurant owner
   - Order accepted → notify customer
   - Out for delivery → notify customer
   - Order delivered → notify customer + trigger referral
   - Low stock → notify restaurant owner
4. Create `notificationRoutes.js`
5. Wire into `server.js`
6. Verify all syntax + lint
