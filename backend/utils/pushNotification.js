import admin from "firebase-admin";

let initialized = false;

/**
 * Lazily initialize Firebase Admin.
 * Must be called at least once before sendPush.
 */
export function initPushNotifications() {
  if (initialized) return;
  if (!admin.apps.length) {
    try {
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log("🔥 Firebase Admin initialized successfully.");
      }
    } catch (error) {
      console.error("❌ Firebase Admin initialization error:", error.message);
    }
  }
  initialized = true;
}

export const sendPush = async (fcmToken, title, body, data = {}) => {
  if (!fcmToken) return null;
  // Ensure init has been called (safe no-op if already initialized)
  initPushNotifications();
  if (!admin.apps.length) return null;

  const payload = {
    notification: { title, body },
    data: {
      ...data,
      click_action: "FLUTTER_NOTIFICATION_CLICK",
    },
    token: fcmToken,
  };

  try {
    const response = await admin.messaging().send(payload);
    return response;
  } catch (error) {
    console.error("❌ Push notification error:", error.message, error.code || "");
    return null;
  }
};