# Evaluated List Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an empty Evaluated List tab immediately after Saved Evaluations on the Evaluations page.

**Architecture:** Keep the change local to the existing Evaluations page and extend its current constant-driven tab state. Add an explicit empty render branch so the Create Evaluation branch remains reachable only through its existing internal state.

**Tech Stack:** React 18, Reactstrap, Vite, ESLint

---

## File Structure

- Modify `src/pages/Evaluations/index.jsx`: register the tab, render its button, and render an empty card when selected.
- No new production component is warranted because the empty tab has no independent behavior yet.

### Task 1: Add the Empty Evaluated List Tab

**Files:**
- Modify: `src/pages/Evaluations/index.jsx:18-22`
- Modify: `src/pages/Evaluations/index.jsx:239-256`
- Modify: `src/pages/Evaluations/index.jsx:436-447`

- [ ] **Step 1: Confirm the tab is absent before implementation**

Run:

```powershell
rg -n 'EVALUATED|Evaluated List' src/pages/Evaluations/index.jsx
```

Expected: no matches and exit code 1, confirming the requested UI is not already present. The repository currently has no configured automated test runner, so this source-level precondition plus the build and lint checks below are the available verification path.

- [ ] **Step 2: Register the tab state**

Add `EVALUATED` to the existing constants:

```jsx
const TABS = {
  FILES: "files",
  CREATE: "create",
  SAVED: "saved",
  EVALUATED: "evaluated",
};
```

- [ ] **Step 3: Render the tab button after Saved Evaluations**

Add this button immediately after the existing Saved Evaluations button:

```jsx
<Button
  color={activeTab === TABS.EVALUATED ? "primary" : "light"}
  className={activeTab === TABS.EVALUATED ? "" : "border"}
  onClick={() => setActiveTab(TABS.EVALUATED)}
>
  Evaluated List
</Button>
```

- [ ] **Step 4: Render an explicitly empty tab panel**

Insert this render branch after the Saved Evaluations branch and before the existing Create Evaluation fallback:

```jsx
) : activeTab === TABS.EVALUATED ? (
  <Card className="mb-4">
    <CardBody />
  </Card>
) : (
```

This keeps the panel intentionally blank while preserving a stable content container for later work.

- [ ] **Step 5: Run focused lint**

Run:

```powershell
npx eslint src/pages/Evaluations/index.jsx
```

Expected: exit code 0 with no errors.

- [ ] **Step 6: Build the frontend**

Run:

```powershell
npm run build
```

Expected: Vite completes successfully and emits the production bundle.

- [ ] **Step 7: Confirm the final source contract**

Run:

```powershell
rg -n 'EVALUATED|Evaluated List' src/pages/Evaluations/index.jsx
```

Expected: matches for the tab constant, button active state and click handler, render branch, and visible label.

- [ ] **Step 8: Commit the implementation**

```powershell
git add src/pages/Evaluations/index.jsx
git commit -m "feat: add evaluated list tab"
```
