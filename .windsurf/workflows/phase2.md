---
description: Enterprise Phase 2 — Inventory, Performance & Commission
---

# Phase 2 Implementation Workflow

## Scope
- FEAT-14: Smart Inventory Auto-Disable
- FEAT-9:  Restaurant Performance Score
- FEAT-2:  Restaurant Commission & Payout Engine

## Step 1 — Smart Inventory Auto-Disable
// turbo
1. Update `productModel.js` — add `autoDisable: Boolean`, `lastRestocked: Date`
2. Update `orderController.js` — after stock decrement, if `countInStock === 0`, set `isAvailable: false`
3. Update `productController.js` — on restock, auto-enable if `autoDisable === true`
4. Create `inventoryController.js` — low-stock alerts, bulk restock API
5. Create `inventoryRoutes.js` — admin-only routes
6. Wire into `server.js`
7. Verify with `node --check`

## Step 2 — Restaurant Performance Score
1. Update `restaurantModel.js` — add `performanceScore: Number` (0-100), `scoreMetrics: Object`
2. Create `analyticsController.js` — calculate score algorithm:
   - Delivery time vs target (40%)
   - Avg customer rating (30%)
   - Monthly order volume (20%)
   - Cancellation rate (10%)
3. Run as aggregate pipeline on `orders` collection
4. Create `GET /api/v1/analytics/restaurant/:id/performance` — admin + restaurant owner
5. Add score badge to restaurant cards in frontend

## Step 3 — Restaurant Commission Engine
1. Update `orderModel.js` — add `restaurantCommission`, `restaurantPayout`, `payoutStatus`
2. Update `orderController.js` — calculate commission (e.g. 12-18%) on order creation
3. Create `payoutController.js`:
   - `GET /api/v1/payouts/restaurant/:id` — earnings summary
   - `POST /api/v1/payouts/restaurant/:id/request` — payout request
   - `GET /api/v1/payouts/admin/all` — admin overview
4. Create `payoutModel.js` — track payout requests with status (pending, processing, paid)
5. Create `payoutRoutes.js` — wire auth + role guards
6. Wire into `server.js`
7. Verify syntax + lint
