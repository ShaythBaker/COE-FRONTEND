const idString = value => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return idString(value._id || value.$oid);
};

export const normalizeTaskNotifications = payload => {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const unreadCount = Number.isFinite(payload?.unreadCount)
    ? payload.unreadCount
    : items.filter(item => !item?.READ_ON).length;
  return { items, unreadCount };
};

export const taskNotificationLink = notification => {
  const taskId = idString(notification?.TASK_ID);
  return taskId ? `/tasks?task=${encodeURIComponent(taskId)}` : "/tasks";
};
