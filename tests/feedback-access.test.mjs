import test from "node:test";
import assert from "node:assert/strict";
import { isFeedbackAdmin } from "../src/lib/feedback-access.mjs";

test("feedback administration requires a server-managed boolean claim", () => {
  assert.equal(isFeedbackAdmin({ app_metadata: { feedback_admin: true } }), true);
  for (const user of [
    null, {}, { email: "owner@example.com" },
    { user_metadata: { feedback_admin: true } },
    { app_metadata: { feedback_admin: false } },
    { app_metadata: { feedback_admin: "true" } },
  ]) assert.equal(isFeedbackAdmin(user), false);
});
