---
description: Enterprise Phase 4 — i18n, Delivery ETA, Chat Attachments, Thumbnails
---

# Phase 4 Implementation Workflow

## Scope
- FEAT-8:  Multi-Language Support (i18n)
- FEAT-12: Delivery ETA with Dynamic Re-routing
- FEAT-15: Chat System with File Attachments
- FEAT-17: Serverless Thumbnail Generation

## Step 1 — Multi-Language Support (i18n)
1. Install react-i18next + i18next + i18next-browser-languagedetector
2. Create i18n config with EN + HI locales
3. Create translation files: `public/locales/en/common.json`, `public/locales/hi/common.json`
4. Wrap app with I18nextProvider
5. Add language toggle in Navbar
6. Replace hardcoded strings in critical pages (Home, Cart, Checkout, Profile)

## Step 2 — Delivery ETA Engine
1. Update `orderModel.js` — add `estimatedDeliveryAt: Date`, `etaUpdates: Array`
2. Create `etaController.js` — calculate ETA based on distance, traffic, prep time
3. Integrate ETA calculation into `orderController.js` on order creation
4. Update `deliveryController.js` — recalculate ETA on status changes, emit updates
5. Frontend: Show live ETA countdown in OrderTracking page

## Step 3 — Chat File Attachments
1. Update `chatModel.js` — add `attachments: [{ url, type, name }]`
2. Update `chatController.js` — handle multipart upload, validate file types/size
3. Update `chatRoutes.js` — add multer middleware for file upload
4. Frontend: Add file picker + preview in Chat component, render images inline

## Step 4 — Serverless Thumbnail Generation
1. Create `imageController.js` — on-the-fly resize endpoint `/api/v1/upload/thumbnail?url=...&w=300`
2. Use Sharp or Canvas for server-side resizing (fallback)
3. Add CDN caching headers
4. Update frontend image components to use thumbnail endpoint for galleries

## Verification
- node --check all new/modified backend files
- npm run lint frontend
- Commit + push after each step
