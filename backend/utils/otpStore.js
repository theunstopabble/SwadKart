const store = new Map();

export const setOTP = (userId, data) => {
  const existing = store.get(String(userId));
  if (existing) clearTimeout(existing.timeout);
  const timeout = setTimeout(() => store.delete(String(userId)), 5 * 60 * 1000);
  store.set(String(userId), { ...data, timeout });
};

export const getOTP = (userId) => store.get(String(userId));

export const deleteOTP = (userId) => {
  const entry = store.get(String(userId));
  if (entry) clearTimeout(entry.timeout);
  store.delete(String(userId));
};
