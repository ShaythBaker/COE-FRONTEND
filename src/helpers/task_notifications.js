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

export const notificationTimeAgo = (value, now = Date.now()) => {
  const createdAt = new Date(value).getTime();
  if (!Number.isFinite(createdAt)) return "";

  const seconds = Math.max(0, Math.floor((Number(now) - createdAt) / 1000));
  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

export const taskNotificationLink = notification => {
  const taskId = idString(notification?.TASK_ID);
  return taskId ? `/tasks?task=${encodeURIComponent(taskId)}` : "/tasks";
};

export const taskNotificationMeta = notification => {
  if (notification?.TYPE === "TASK_OVERDUE") {
    return {
      title: "Task Overdue",
      icon: "bx bx-error-circle",
      color: "danger",
      showDate: true,
    };
  }

  if (notification?.TYPE === "TASK_ASSIGNED") {
    return {
      title: "New Task Assigned",
      icon: "bx bx-task",
      color: "primary",
      showDate: false,
    };
  }

  if (notification?.TYPE === "TASK_CLOSED") {
    return {
      title: "Task Completed",
      icon: "bx bx-check-circle",
      color: "success",
      showDate: false,
    };
  }

  return {
    title: "Task Due Today",
    icon: "bx bx-calendar-exclamation",
    color: "warning",
    showDate: true,
  };
};

export const subscribeToNotificationRefresh = (
  refresh,
  {
    windowObject = typeof window === "undefined" ? null : window,
    documentObject = typeof document === "undefined" ? null : document,
    setIntervalFn = globalThis.setInterval,
    clearIntervalFn = globalThis.clearInterval,
    intervalMs = 10_000,
  } = {},
) => {
  const refreshWhenVisible = () => {
    if (!documentObject || documentObject.visibilityState === "visible") refresh();
  };
  const intervalId = setIntervalFn(refresh, intervalMs);
  windowObject?.addEventListener("focus", refresh);
  documentObject?.addEventListener("visibilitychange", refreshWhenVisible);

  return () => {
    clearIntervalFn(intervalId);
    windowObject?.removeEventListener("focus", refresh);
    documentObject?.removeEventListener("visibilitychange", refreshWhenVisible);
  };
};
