# Task Due Status and Bell Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Derive Pending, Due Today, Overdue, and Closed task statuses in Amman time and show persistent due-today notifications in the assigned user's header bell.

**Architecture:** The backend keeps workflow persistence limited to `PENDING` and `CLOSED`, adds a pure status helper, and decorates task API responses with `DISPLAY_STATUS`. A dedicated notification model and authenticated routes materialize one notification per task/due-date occurrence, while the React header consumes those routes and the Tasks page renders the derived badge.

**Tech Stack:** Node.js ES modules, Express, Mongoose, Node test runner, React 18, Reactstrap, Axios, Vite.

---

### Task 1: Derived task status

**Files:**
- Create: `COE-BACKEND/src/modules/tasks/status.js`
- Create: `COE-BACKEND/src/modules/tasks/status.test.js`
- Modify: `COE-BACKEND/src/modules/tasks/controller.js`

- [ ] Write tests asserting `getTaskDisplayStatus()` returns `CLOSED` first, then `PENDING`, `DUE_TODAY`, or `OVERDUE` by comparing `DUE_DATE` with an injected `now` in `Asia/Amman`.
- [ ] Run `node --test src/modules/tasks/status.test.js` from `COE-BACKEND` and confirm the missing-module failure.
- [ ] Implement `ammanDateKey(date)` with `Intl.DateTimeFormat(...).formatToParts()` and `getTaskDisplayStatus(task, now)` as pure exported functions.
- [ ] Add `DISPLAY_STATUS: getTaskDisplayStatus(task)` when task responses are decorated in `addRelatedItemNames()`.
- [ ] Re-run the focused test and existing backend tests with `node --test src/modules/**/*.test.js`; expect all tests to pass.
- [ ] Commit backend changes with `git commit -m "feat: derive task due status"`.

### Task 2: Persistent task notifications API

**Files:**
- Create: `COE-BACKEND/src/modules/Mongoose/TaskNotification.js`
- Create: `COE-BACKEND/src/modules/task-notifications/service.js`
- Create: `COE-BACKEND/src/modules/task-notifications/service.test.js`
- Create: `COE-BACKEND/src/modules/task-notifications/controller.js`
- Create: `COE-BACKEND/src/modules/task-notifications/router.js`
- Modify: `COE-BACKEND/src/routes/index.js`

- [ ] Write service tests around dependency-injected repositories: only open tasks assigned to the user and due today are materialized; the upsert key contains recipient, task, type, and Amman due-date key; duplicate calls remain idempotent; closed tasks are excluded.
- [ ] Run `node --test src/modules/task-notifications/service.test.js` and confirm failure because the service is absent.
- [ ] Add a notification schema with `COMPANY_ID`, `RECIPIENT_ID`, `TASK_ID`, `TYPE`, `DUE_DATE_KEY`, `MESSAGE`, `READ_ON`, `CREATED_ON`, and a unique compound index.
- [ ] Implement `materializeDueTaskNotifications()` and `listTaskNotifications()` using Task and TaskNotification models, with duplicate-key-safe upserts.
- [ ] Implement `GET /task-notifications` returning `{ items, unreadCount }` and `PATCH /task-notifications/:id/read` scoped to the authenticated company and recipient.
- [ ] Mount the authenticated router from `src/routes/index.js`.
- [ ] Run focused and full backend tests; expect all to pass.
- [ ] Commit backend changes with `git commit -m "feat: add due task notifications"`.

### Task 3: Frontend status presentation

**Files:**
- Create: `COE-FRONTEND/src/helpers/task_status.js`
- Create: `COE-FRONTEND/src/helpers/task_status.test.js`
- Modify: `COE-FRONTEND/src/pages/Tasks/index.jsx`

- [ ] Write tests asserting badge metadata maps `PENDING`, `DUE_TODAY`, `OVERDUE`, and `CLOSED` to the labels and colors `Pending/warning`, `Due Today/info`, `Overdue/danger`, and `Closed/success`.
- [ ] Run `node --test src/helpers/task_status.test.js` and confirm the missing-module failure.
- [ ] Implement `getTaskStatusMeta(task)` using `DISPLAY_STATUS` with a safe fallback to stored `STATUS`.
- [ ] Replace both hard-coded Pending/Closed badge blocks in the task table and details modal with the helper result while keeping close permissions based on stored `STATUS`.
- [ ] Run the focused test and `npm run build`; expect success.
- [ ] Commit frontend changes with `git commit -m "feat: show task due statuses"`.

### Task 4: Bell notification integration

**Files:**
- Modify: `COE-FRONTEND/src/helpers/url_helper.jsx`
- Create: `COE-FRONTEND/src/helpers/task_notifications.js`
- Create: `COE-FRONTEND/src/helpers/task_notifications.test.js`
- Modify: `COE-FRONTEND/src/components/CommonForBoth/TopbarDropdown/NotificationDropdown.jsx`

- [ ] Write helper tests for normalizing the API response, unread count, and task link `/tasks?task=<id>`.
- [ ] Run `node --test src/helpers/task_notifications.test.js` and confirm failure because the helper is absent.
- [ ] Add `TASK_NOTIFICATIONS` and `TASK_NOTIFICATION_READ(id)` URL exports and implement normalization/link helpers.
- [ ] Replace static bell entries with fetched notification state, unread badge, loading/empty/error states, and a click handler that marks the item read before navigating to its task link.
- [ ] Refresh notifications when the dropdown opens so a due-today record is materialized without polling.
- [ ] Run helper tests, `npm run lint`, and `npm run build`; fix only failures introduced by this feature.
- [ ] Commit frontend changes with `git commit -m "feat: connect task notifications bell"`.

### Task 5: End-to-end verification

**Files:**
- Modify only if verification reveals a feature regression.

- [ ] Run all backend Node tests and confirm zero failures.
- [ ] Run all frontend helper tests and confirm zero failures.
- [ ] Run the frontend production build and confirm completion.
- [ ] Inspect both Git worktrees to confirm no unrelated files were changed.
- [ ] Verify manually through the API that a due-today pending task returns `DISPLAY_STATUS: "DUE_TODAY"`, appears once for its assignee, becomes read through the PATCH route, and a closed task no longer appears.
- [ ] Record the exact verification results in the handoff.
