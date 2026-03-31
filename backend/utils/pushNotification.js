import admin from "firebase-admin";

// Initialize Firebase Admin (Assuming FIREBASE_SERVICE_ACCOUNT is a stringified JSON in env vars)
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

export const sendPush = async (fcmToken, title, body, data = {}) => {
  if (!fcmToken) return null;

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
    console.log("✅ Successfully sent push notification:", response);
    return response;
  } catch (error) {
    console.error("❌ Error sending push notification:", error.message);
    return null;
  }
};
