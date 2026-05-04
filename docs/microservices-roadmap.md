# SwadKart Microservices Architecture Roadmap (FEAT-30)

## Current: Monolith Architecture

All services run in a single Node.js process:
- API Gateway (Express)
- Auth & User Management
- Restaurant & Catalog Management
- Order Processing
- Payment Handling (Stripe/Razorpay)
- Notification Service (FCM + Socket.io)
- Delivery Assignment & Tracking
- Analytics & Reporting

## Proposed: Service Boundaries (Phase 6)

```
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway (Nginx/Kong)                  │
│                   Rate Limit / Auth / SSL                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
    ┌──────────┬───────┴───────┬──────────┬──────────┐
    │          │               │          │          │
    ▼          ▼               ▼          ▼          ▼
┌────────┐ ┌────────┐   ┌──────────┐ ┌──────┐ ┌──────────┐
│  Auth  │ │ Catalog │   │  Order   │ │Notification│ │ Analytics│
│Service │ │ Service │   │ Service  │ │  Service   │ │  Service │
└────────┘ └────────┘   └──────────┘ └──────┘ └──────────┘
    │          │               │          │          │
    ▼          ▼               ▼          ▼          ▼
┌────────┐ ┌────────┐   ┌──────────┐ ┌──────┐ ┌──────────┐
│  DB    │ │  DB     │   │   DB     │ │ Redis│ │   DB     │
│(Users) │ │(Catalog)│   │(Orders)  │ │Queue │ │(Events)  │
└────────┘ └────────┘   └──────────┘ └──────┘ └──────────┘
```

## Service Breakdown

### 1. Auth Service
- **Scope:** User registration, login, JWT, OAuth (Google), biometric (WebAuthn)
- **Data:** Users collection
- **Event:** `user.created`, `user.updated`

### 2. Catalog Service
- **Scope:** Restaurants, Products, Menus, Reviews, Scheduling
- **Data:** Restaurants, Products, Reviews
- **Cache:** Redis (5-min TTL for lists)

### 3. Order Service
- **Scope:** Cart, Checkout, Order lifecycle, Delivery assignment, ETA engine
- **Data:** Orders, GroupOrders, Subscriptions
- **Event:** `order.placed`, `order.confirmed`, `order.delivered`

### 4. Notification Service
- **Scope:** Push notifications (FCM), SMS, Email, Socket.io real-time
- **Queue:** BullMQ / Redis Streams
- **Consumers:** FCM worker, SMS worker, Email worker

### 5. Analytics Service
- **Scope:** Performance scores, Leaderboard, Admin dashboards, AI recommendations
- **Data:** Aggregated metrics, read replicas
- **Cache:** Redis (1-min TTL for leaderboards)

## Inter-Service Communication

| Pattern | Use Case | Implementation |
|---------|----------|----------------|
| REST API | Sync requests (catalog → order validation) | HTTP/JSON |
| Event Bus | Async (order placed → notification sent) | Redis Pub/Sub or BullMQ |
| gRPC | High-performance internal calls | Future upgrade |

## Data Isolation

| Service | Primary DB | Shared Read |
|---------|-----------|-------------|
| Auth | `users` collection | Catalog (restaurant owner lookup) |
| Catalog | `restaurants`, `products` | Order (item price validation) |
| Order | `orders` | Analytics (revenue aggregation) |
| Notification | `notifications` | — |
| Analytics | `analytics_events` | All services (read replicas) |

## Migration Path

### Phase 1: Shared DB, Separate Controllers (Current)
- Controllers organized by domain
- Clear service boundaries in code

### Phase 2: Shared DB, Separate Modules
- Each service in its own folder with dedicated routes
- Internal API calls via HTTP (localhost)

### Phase 3: Separate Processes
- Run services as separate Node.js processes
- Use PM2 or Docker Compose locally
- Shared MongoDB with collection-level isolation

### Phase 4: Independent Deployments
- Each service in its own Git repo / Docker image
- Kubernetes deployment with service mesh
- Dedicated databases per service

## Infrastructure

| Component | Local Dev | Production (Future) |
|-----------|-----------|---------------------|
| Orchestration | Docker Compose | Kubernetes (FEAT-31) |
| API Gateway | Nginx | Kong / Ambassador |
| Service Discovery | Docker DNS | Consul / k8s DNS |
| Config Management | .env files | HashiCorp Vault |
| Observability | Console logs | ELK Stack / Datadog |

## Files Ready for Extraction

- `backend/controllers/orderController.js` → Order Service
- `backend/controllers/notificationController.js` → Notification Service
- `backend/controllers/analyticsController.js` → Analytics Service
- `backend/controllers/restaurantController.js` → Catalog Service
- `backend/controllers/userController.js` → Auth Service

## Notes

- Redis is already configured with fallback — serves as shared cache + event bus
- Socket.io rooms already namespace by user/order — easy to split to dedicated notification service
- BullMQ is already installed — can be used as job queue for async tasks
