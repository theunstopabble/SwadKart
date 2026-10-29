import asyncHandler from "express-async-handler";
import prisma from "../config/prisma.js";
import { sanitizeObjectId } from "../utils/sanitize.js";

// @desc    Send a notification to a user (and store in DB)
// @route   POST /api/v1/notifications/send
// @access  Admin / System
export const sendNotification = asyncHandler(async (req, res) => {
  const { userId: rawUserId, title, body, type = "system", data = {} } = req.body;

  if (!rawUserId || !title || !body) {
    return res.status(400).json({ message: "userId, title, body required" });
  }

  const userId = sanitizeObjectId(rawUserId);

  let notification = await prisma.notification.create({
    data: {
      userId,
      title,
      body,
      type,
      data,
      sentVia: ["in_app"],
    },
  });

  // Attempt FCM push if fcmToken exists (non-blocking)
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });
    if (user?.fcmToken) {
      const { getMessaging } = await import("firebase-admin/messaging");
      const { default: admin } = await import("firebase-admin");
      if (!admin.apps.length) throw new Error("Firebase not initialized");
      await getMessaging().send({
        token: user.fcmToken,
        notification: { title, body },
        data: Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)]),
        ),
      });
      notification = await prisma.notification.update({
        where: { id: notification.id },
        data: {
          fcmSent: true,
          sentVia: ["in_app", "push"],
        },
      });
    }
  } catch (fcmErr) {
    console.error("🔔 FCM push failed (non-blocking):", fcmErr.message);
  }

  res.status(201).json({ message: "Notification sent", notification });
});

// @desc    Get current user's notifications
// @route   GET /api/v1/notifications/my
// @access  User
export const getMyNotifications = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id || req.user._id;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Number(req.query.limit) || 20);

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: currentUserId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({
      where: { userId: currentUserId, read: false },
    }),
  ]);

  res.json({ notifications, unreadCount, page, limit });
});

// @desc    Mark notifications as read
// @route   PATCH /api/v1/notifications/read
// @access  User
export const markRead = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id || req.user._id;
  const { ids } = req.body; // Array of notification IDs, or "all"

  if (ids === "all") {
    await prisma.notification.updateMany({
      where: { userId: currentUserId, read: false },
      data: { read: true },
    });
    return res.json({ message: "All notifications marked as read" });
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: "Provide ids array or 'all'" });
  }

  // Sanitize each ObjectId in the array
  const sanitizedIds = ids
    .map((id) => {
      try {
        return sanitizeObjectId(id);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  if (sanitizedIds.length === 0) {
    return res.status(400).json({ message: "No valid notification IDs provided" });
  }

  await prisma.notification.updateMany({
    where: { id: { in: sanitizedIds }, userId: currentUserId },
    data: { read: true },
  });

  res.json({ message: "Notifications marked as read", count: sanitizedIds.length });
});

// @desc    Send bulk notification (admin)
// @route   POST /api/v1/notifications/bulk
// @access  Admin
export const sendBulkNotification = asyncHandler(async (req, res) => {
  const { role, title, body, type = "promotion", data = {} } = req.body;

  if (!title || !body) {
    return res.status(400).json({ message: "title and body required" });
  }

  const allowedRoles = ["user", "admin", "delivery_partner", "restaurant_owner"];
  const roleFilter = (role && allowedRoles.includes(role)) ? role : null;
  const filter = roleFilter ? { role: roleFilter } : {};
  const totalUsers = await prisma.user.count({ where: filter });

  const FCM_CONCURRENCY = 50;
  const PAGE_SIZE = 500;
  const notificationIds = [];

  const sendFCM = async (user, notifId) => {
    if (!user.fcmToken) return;
    try {
      const { getMessaging } = await import("firebase-admin/messaging");
      const { default: admin } = await import("firebase-admin");
      if (!admin.apps.length) throw new Error("Firebase not initialized");
      await getMessaging().send({
        token: user.fcmToken,
        notification: { title, body },
        data: Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)]),
        ),
      });
      await prisma.notification.update({
        where: { id: notifId },
        data: {
          fcmSent: true,
          sentVia: ["in_app", "push"],
        },
      });
    } catch (fcmErr) {
      // Ignored for individual failure
    }
  };

  // Create notifications and batch FCM with concurrency control
  for (let page = 0; page * PAGE_SIZE < totalUsers; page++) {
    const users = await prisma.user.findMany({
      where: filter,
      select: { id: true, fcmToken: true },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
    });

    const fcmBatch = [];
    for (const user of users) {
      const notif = await prisma.notification.create({
        data: {
          userId: user.id,
          title,
          body,
          type,
          data,
          sentVia: ["in_app"],
        },
      });
      notificationIds.push(notif.id);

      if (user.fcmToken) {
        fcmBatch.push(sendFCM(user, notif.id));
      }

      if (fcmBatch.length >= FCM_CONCURRENCY) {
        await Promise.allSettled(fcmBatch.splice(0, FCM_CONCURRENCY));
      }
    }

    await Promise.allSettled(fcmBatch);
  }

  res.status(201).json({
    message: "Bulk notifications sent",
    count: notificationIds.length,
  });
});

// @desc    Helper: create notification internally (used by other controllers)
export const createNotification = async (userId, title, body, type, data = {}) => {
  try {
    let notification = await prisma.notification.create({
      data: {
        userId,
        title,
        body,
        type,
        data,
        sentVia: ["in_app"],
      },
    });

    // Attempt FCM non-blocking
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });
    if (user?.fcmToken) {
      try {
        const { getMessaging } = await import("firebase-admin/messaging");
        const { default: admin } = await import("firebase-admin");
        if (!admin.apps.length) throw new Error("Firebase not initialized");
        await getMessaging().send({
          token: user.fcmToken,
          notification: { title, body },
          data: Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, String(v)]),
          ),
        });
        notification = await prisma.notification.update({
          where: { id: notification.id },
          data: {
            fcmSent: true,
            sentVia: ["in_app", "push"],
          },
        });
      } catch (fcmErr) {
        // FCM error non-blocking
      }
    }

    return notification;
  } catch (err) {
    console.error("🔔 Notification create error (non-blocking):", err.message);
    return null;
  }
};
