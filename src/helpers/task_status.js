const STATUS_META = {
  PENDING: { key: "PENDING", label: "Pending", color: "warning" },
  DUE_TODAY: { key: "DUE_TODAY", label: "Due Today", color: "info" },
  OVERDUE: { key: "OVERDUE", label: "Overdue", color: "danger" },
  CLOSED: { key: "CLOSED", label: "Closed", color: "success" },
};

export const getTaskStatusMeta = task => {
  const key = String(task?.DISPLAY_STATUS || task?.STATUS || "PENDING").toUpperCase();
  return STATUS_META[key] || STATUS_META.PENDING;
};
