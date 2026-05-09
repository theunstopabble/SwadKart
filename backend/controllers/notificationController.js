import asyncHandler from "express-async-handler";
import Notification from "../models/notificationModel.js";
import User from "../models/userModel.js";
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

  const notification = await Notification.create({
    user: userId,
    title,
    body,
    type,
    data,
    sentVia: ["in_app"],
  });

  // Attempt FCM push if fcmToken exists (non-blocking)
  try {
    const user = await User.findById(userId).select("fcmToken").lean();
    if (user?.fcmToken) {
      // Dynamic import to avoid loading firebase-admin if not configured
      const { getMessaging } = await import("firebase-admin/messaging");
      if (admin.apps.length === 0) throw new Error("Firebase not initialized");
      await getMessaging().send({
        token: user.fcmToken,
        notification: { title, body },
        data: Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)]),
        ),
      });
      notification.fcmSent = true;
      notification.sentVia.push("push");
      await notification.save();
    }
  } catch (fcmErr) {
    console.error("🔔 FCM push failed (non-blocking):", fcmErr.message);
    notification.fcmResponse = fcmErr.message;
    await notification.save();
  }

  res.status(201).json({ message: "Notification sent", notification });
});

// @desc    Get current user's notifications
// @route   GET /api/v1/notifications/my
// @access  User
export const getMyNotifications = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Number(req.query.limit) || 20);

  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);

  res.json({ notifications, unreadCount, page, limit });
});

// @desc    Mark notifications as read
// @route   PATCH /api/v1/notifications/read
// @access  User
export const markRead = asyncHandler(async (req, res) => {
  const { ids } = req.body; // Array of notification IDs, or "all"

  if (ids === "all") {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true } },
    );
    return res.json({ message: "All notifications marked as read" });
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: "Provide ids array or 'all'" });
  }

  // 🛡️ Sanitize each ObjectId in the array
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

  await Notification.updateMany(
    { _id: { $in: sanitizedIds }, user: req.user._id },
    { $set: { read: true } },
  );

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

  const filter = role ? { role } : {};
  const users = await User.find(filter).select("_id fcmToken").lean();

  const notifications = [];
  for (const user of users) {
    const notif = await Notification.create({
      user: user._id,
      title,
      body,
      type,
      data,
      sentVia: ["in_app"],
    });
    notifications.push(notif._id);

    // Non-blocking FCM
    if (user.fcmToken) {
      try {
        const { getMessaging } = await import("firebase-admin/messaging");
        await getMessaging().send({
          token: user.fcmToken,
          notification: { title, body },
          data: Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, String(v)]),
          ),
        });
        notif.fcmSent = true;
        notif.sentVia.push("push");
        await notif.save();
      } catch (fcmErr) {
        notif.fcmResponse = fcmErr.message;
        await notif.save();
      }
    }
  }

  res.status(201).json({
    message: "Bulk notifications sent",
    count: notifications.length,
  });
});

// @desc    Helper: create notification internally (used by other controllers)
export const createNotification = async (userId, title, body, type, data = {}) => {
  try {
    const notification = await Notification.create({
      user: userId,
      title,
      body,
      type,
      data,
      sentVia: ["in_app"],
    });

    // Attempt FCM non-blocking
    const user = await User.findById(userId).select("fcmToken").lean();
    if (user?.fcmToken) {
      try {
        const { getMessaging } = await import("firebase-admin/messaging");
        await getMessaging().send({
          token: user.fcmToken,
          notification: { title, body },
          data: Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, String(v)]),
          ),
        });
        notification.fcmSent = true;
        notification.sentVia.push("push");
        await notification.save();
      } catch (fcmErr) {
        notification.fcmResponse = fcmErr.message;
        await notification.save();
      }
    }

    return notification;
  } catch (err) {
    console.error("🔔 Notification create error (non-blocking):", err.message);
    return null;
  }
};
