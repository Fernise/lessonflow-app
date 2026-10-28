import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const memorySource = readFileSync(new URL("../src/lib/student-memory.ts", import.meta.url), "utf8");
const aiSource = readFileSync(new URL("../src/lib/ai/material-service.ts", import.meta.url), "utf8");

test("student memory exposes topic history, review needs, and suggested next topics", () => {
  assert.match(memorySource, /export function getRecentlyStudiedTopics/);
  assert.match(memorySource, /export function getStudentReviewNeeds/);
  assert.match(memorySource, /export function getSuggestedNextTopics/);
});

test("AI prompt context includes student memory signals for personalization", () => {
  assert.match(aiSource, /recentlyStudiedTopics/);
  assert.match(aiSource, /topicsToAvoidOrDeprioritize/);
  assert.match(aiSource, /suggestedNextTopics/);
  assert.match(aiSource, /studentReviewNeeds/);
});
