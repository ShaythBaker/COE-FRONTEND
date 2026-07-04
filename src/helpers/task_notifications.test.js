import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeTaskNotifications,
  taskNotificationLink,
  taskNotificationMeta,
} from "./task_notifications.js";

test("normalizes notification payload and derives unread count when absent", () => {
  assert.deepEqual(
    normalizeTaskNotifications({
      items: [{ _id: "n1", READ_ON: null }, { _id: "n2", READ_ON: "2026-07-04" }],
    }),
    {
      items: [{ _id: "n1", READ_ON: null }, { _id: "n2", READ_ON: "2026-07-04" }],
      unreadCount: 1,
    },
  );
});

test("builds a direct tasks-page link from populated or plain task ids", () => {
  assert.equal(taskNotificationLink({ TASK_ID: { _id: "task-1" } }), "/tasks?task=task-1");
  assert.equal(taskNotificationLink({ TASK_ID: "task-2" }), "/tasks?task=task-2");
});

test("presents assigned and closed task notifications differently", () => {
  assert.deepEqual(taskNotificationMeta({ TYPE: "TASK_ASSIGNED" }), {
    title: "New Task Assigned",
    icon: "bx bx-task",
    color: "primary",
    showDate: false,
  });
  assert.deepEqual(taskNotificationMeta({ TYPE: "TASK_CLOSED" }), {
    title: "Task Completed",
    icon: "bx bx-check-circle",
    color: "success",
    showDate: false,
  });
  assert.equal(taskNotificationMeta({ TYPE: "TASK_DUE_TODAY" }).title, "Task Due Today");
});

test("presents overdue notifications with a danger treatment", () => {
  assert.deepEqual(taskNotificationMeta({ TYPE: "TASK_OVERDUE" }), {
    title: "Task Overdue",
    icon: "bx bx-error-circle",
    color: "danger",
    showDate: true,
  });
});
