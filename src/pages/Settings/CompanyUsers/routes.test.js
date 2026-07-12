import test from "node:test";
import assert from "node:assert/strict";

import { companyUserProfilePath } from "./routes.js";

test("companyUserProfilePath points View actions at the selected user profile route", () => {
  assert.equal(companyUserProfilePath("user-123"), "/settings/users/user-123");
});
