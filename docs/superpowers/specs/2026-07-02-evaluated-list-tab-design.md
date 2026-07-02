# Evaluated List Tab Design

## Goal

Add an **Evaluated List** tab to the Evaluations page directly after **Saved Evaluations**.

## Behavior

- The new tab uses the existing tab button styling and active-state behavior.
- Selecting it displays an empty content area for now.
- It does not fetch, filter, or display evaluation data.
- Existing Files List and Saved Evaluations behavior remains unchanged.

## Implementation Shape

- Add an `EVALUATED` value to the page's tab constants.
- Add the new tab button after Saved Evaluations.
- Add an explicit render branch for the selected tab with an empty card body so future evaluated-list content has a clear home.

## Verification

- A UI test confirms the new tab is visible after Saved Evaluations.
- A UI test confirms selecting the tab activates it and shows no list data.
- Existing relevant tests continue to pass.
