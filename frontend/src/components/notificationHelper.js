export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") {
    await Notification.requestPermission();
  }
};

export const sendNotification = (title, options = {}) => {
  if (Notification.permission === "granted") {
    new Notification(title, {
      icon: "/logo.png",
      badge: "/pwa-192x192.png",
      ...options,
    });
  }
};
