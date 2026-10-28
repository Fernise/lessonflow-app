import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildLessonMessages,
  createMockLessonContent,
  normalizeLessonContent
} from "../src/lib/generation.mjs";

test("buildLessonMessages creates a CEFR-specific JSON contract", () => {
  const messages = buildLessonMessages({
    cefrLevel: "B2",
    inputText: "A transcript about students designing a community garden."
  });

  assert.equal(messages.length, 2);
  assert.match(messages[1].content, /CEFR level: B2/);
  assert.match(messages[1].content, /warmUpQuestions/);
  assert.match(messages[1].content, /vocabulary/);
  assert.match(messages[1].content, /homework/);
});

test("buildLessonMessages rejects unsupported CEFR levels", () => {
  assert.throws(
    () =>
      buildLessonMessages({
        cefrLevel: "Z9",
        inputText: "This should fail."
      }),
    /Unsupported CEFR level/
  );
});

test("normalizeLessonContent trims and limits model output", () => {
  const normalized = normalizeLessonContent({
    warmUpQuestions: [" First question ", "Second question", "Third question", "Extra"],
    vocabulary: [
      { term: " infer ", definition: " understand indirectly ", example: "We infer meaning." },
      { term: "", definition: "missing term", example: "Ignored." }
    ],
    comprehensionQuestions: ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"],
    speakingTask: " Discuss in pairs. ",
    homework: " Write a reflection. "
  });

  assert.deepEqual(normalized.warmUpQuestions, ["First question", "Second question", "Third question"]);
  assert.equal(normalized.vocabulary.length, 1);
  assert.equal(normalized.vocabulary[0].term, "infer");
  assert.equal(normalized.comprehensionQuestions.length, 5);
  assert.equal(normalized.speakingTask, "Discuss in pairs.");
  assert.equal(normalized.homework, "Write a reflection.");
});

test("createMockLessonContent returns a complete lesson pack", () => {
  const mock = createMockLessonContent({
    cefrLevel: "B1",
    inputText: "Students discuss renewable energy projects in their neighborhood."
  });

  assert.equal(mock.warmUpQuestions.length, 3);
  assert.equal(mock.vocabulary.length, 8);
  assert.equal(mock.comprehensionQuestions.length, 5);
  assert.ok(mock.speakingTask.includes("B1"));
  assert.ok(mock.homework.length > 20);
});
