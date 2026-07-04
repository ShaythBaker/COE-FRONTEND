import test from "node:test";
import assert from "node:assert/strict";

import { normalizeTaskNotifications, taskNotificationLink } from "./task_notifications.js";

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
