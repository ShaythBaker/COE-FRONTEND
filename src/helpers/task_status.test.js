import test from "node:test";
import assert from "node:assert/strict";

import { getTaskStatusMeta } from "./task_status.js";

test("maps every task display status to its label and badge color", () => {
  assert.deepEqual(getTaskStatusMeta({ DISPLAY_STATUS: "PENDING" }), {
    key: "PENDING", label: "Pending", color: "warning",
  });
  assert.deepEqual(getTaskStatusMeta({ DISPLAY_STATUS: "DUE_TODAY" }), {
    key: "DUE_TODAY", label: "Due Today", color: "info",
  });
  assert.deepEqual(getTaskStatusMeta({ DISPLAY_STATUS: "OVERDUE" }), {
    key: "OVERDUE", label: "Overdue", color: "danger",
  });
  assert.deepEqual(getTaskStatusMeta({ DISPLAY_STATUS: "CLOSED" }), {
    key: "CLOSED", label: "Closed", color: "success",
  });
});

test("falls back safely to the stored workflow status", () => {
  assert.equal(getTaskStatusMeta({ STATUS: "CLOSED" }).label, "Closed");
  assert.equal(getTaskStatusMeta({}).label, "Pending");
});
