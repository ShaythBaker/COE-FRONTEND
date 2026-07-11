# Task Due Status and Bell Notifications

## Goal

Make an open task's displayed status reflect its due date and notify only the assigned user through the application's notification bell when the task is due today.

## Status rules

Status is derived by the backend using the `Asia/Amman` calendar date:

- `CLOSED` remains `Closed`, regardless of its due date.
- An open task with a due date after today is `Pending`.
- An open task whose due date is today is `Due Today`.
- An open task whose due date is before today is `Overdue`.

The stored workflow status remains `PENDING` or `CLOSED`. The API adds a derived display status so date transitions do not depend on a browser being open or a scheduled job running.

## Bell notification behavior

- Only the task's current assignee receives the due-today notification.
- The notification text is: `You have to complete the task assigned to you.`
- The notification links to the relevant task so the user can open it directly.
- A notification is shown once per task and due-date occurrence. Reading it persists across sessions.
- Editing the task to a different due date creates eligibility for a new notification when that date becomes today.
- Closing the task removes any active due notification from the bell.
- Overdue tasks retain the `Overdue` status but do not generate a new daily notification.

## Backend design

Add a small, independently tested date-status helper. Task list/detail responses expose the derived status without mutating the stored workflow status.

Add persistent task-notification records containing the company, recipient, task, due-date key, read timestamp, creation timestamp, and notification type. A unique key on recipient, task, notification type, and due-date key prevents duplicates.

Authenticated notification endpoints will:

- list the current user's active task notifications;
- mark one notification as read;
- return an unread count for the bell badge.

The notification list operation materializes any missing due-today records for the current user's open tasks before returning results. This keeps the feature reliable without introducing a cron service while ensuring only authenticated assignees can access their notifications.

## Frontend design

The Tasks table and task details render badges for `Pending`, `Due Today`, `Overdue`, and `Closed` using the derived API status.

The existing static notification dropdown becomes data-driven. It fetches the signed-in user's task notifications, shows the unread count, opens the linked task, and marks the selected notification as read. Empty, loading, and request-failure states are handled without blocking the rest of the header.

## Date handling

Calendar comparisons use `Asia/Amman`, not the server or browser's local timezone. Due-date keys use `YYYY-MM-DD` in that timezone to avoid duplicate or early notifications around midnight.

## Testing

Backend tests cover future, today, past, and closed task statuses; timezone boundaries; recipient isolation; duplicate prevention; due-date changes; read persistence; and closed-task suppression.

Frontend tests cover badge labels/colors, unread count, notification rendering, marking as read, task navigation, and empty/error states.

## Out of scope

Email, push, SMS, recurring reminders, and daily repeated overdue notifications are excluded.
