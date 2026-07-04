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
