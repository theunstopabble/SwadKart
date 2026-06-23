export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") {
    await Notification.requestPermission();
  }
};

const stripHtml = (str) => {
  const div = document.createElement("div");
  div.innerHTML = str;
  return div.textContent || div.innerText || "";
};

export const sendNotification = (title, options = {}) => {
  if (Notification.permission === "granted") {
    new Notification(stripHtml(title), {
      ...options,
      icon: options.icon || "/logo.png",
      badge: options.badge || "/pwa-192x192.png",
      body: options.body ? stripHtml(options.body) : undefined,
    });
  }
};
