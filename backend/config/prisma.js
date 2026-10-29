import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

const basePrisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = basePrisma;

/**
 * Extended Prisma Client with virtual `_id` on all models
 * to ensure seamless backward compatibility with existing frontend code.
 */
export const prisma = basePrisma.$extends({
  result: {
    user: {
      _id: {
        needs: { id: true },
        compute(user) {
          return user.id;
        },
      },
    },
    restaurant: {
      _id: {
        needs: { id: true },
        compute(r) {
          return r.id;
        },
      },
    },
    product: {
      _id: {
        needs: { id: true },
        compute(p) {
          return p.id;
        },
      },
    },
    order: {
      _id: {
        needs: { id: true },
        compute(o) {
          return o.id;
        },
      },
    },
    review: {
      _id: {
        needs: { id: true },
        compute(r) {
          return r.id;
        },
      },
    },
    coupon: {
      _id: {
        needs: { id: true },
        compute(c) {
          return c.id;
        },
      },
    },
    notification: {
      _id: {
        needs: { id: true },
        compute(n) {
          return n.id;
        },
      },
      user: {
        needs: { userId: true },
        compute(n) {
          return n.userId;
        },
      },
    },
    subscription: {
      _id: {
        needs: { id: true },
        compute(s) {
          return s.id;
        },
      },
      user: {
        needs: { userId: true },
        compute(s) {
          return s.userId;
        },
      },
      restaurant: {
        needs: { restaurantId: true },
        compute(s) {
          return s.restaurantId;
        },
      },
    },
    groupOrder: {
      _id: {
        needs: { id: true },
        compute(g) {
          return g.id;
        },
      },
      host: {
        needs: { hostId: true },
        compute(g) {
          return g.hostId;
        },
      },
      restaurant: {
        needs: { restaurantId: true },
        compute(g) {
          return g.restaurantId;
        },
      },
    },
    reservation: {
      _id: {
        needs: { id: true },
        compute(r) {
          return r.id;
        },
      },
      user: {
        needs: { userId: true },
        compute(r) {
          return r.userId;
        },
      },
      restaurant: {
        needs: { restaurantId: true },
        compute(r) {
          return r.restaurantId;
        },
      },
    },
    payout: {
      _id: {
        needs: { id: true },
        compute(p) {
          return p.id;
        },
      },
      restaurant: {
        needs: { restaurantId: true },
        compute(p) {
          return p.restaurantId;
        },
      },
    },
    coinTransaction: {
      _id: {
        needs: { id: true },
        compute(c) {
          return c.id;
        },
      },
    },
    emergency: {
      _id: {
        needs: { id: true },
        compute(e) {
          return e.id;
        },
      },
    },
    conversation: {
      _id: {
        needs: { id: true },
        compute(c) {
          return c.id;
        },
      },
    },
    supportMessage: {
      _id: {
        needs: { id: true },
        compute(s) {
          return s.id;
        },
      },
    },
    referral: {
      _id: {
        needs: { id: true },
        compute(r) {
          return r.id;
        },
      },
    },
  },
});

export default prisma;
