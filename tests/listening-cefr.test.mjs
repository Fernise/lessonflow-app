import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const materialService = readFileSync(new URL("../src/lib/ai/material-service.ts", import.meta.url), "utf8");
const mockGeneration = readFileSync(new URL("../src/lib/mock-generation.ts", import.meta.url), "utf8");
const examples = readFileSync(new URL("../docs/listening-cefr-examples.md", import.meta.url), "utf8");

test("Listening prompt has explicit CEFR adaptation for transcript, TF, gaps, and discussion", () => {
  assert.match(materialService, /CEFR adaptation rules/);
  assert.match(materialService, /Transcript: keep wording clear and readable/);
  assert.match(materialService, /True\/False: test explicit comprehension/);
  assert.match(materialService, /Gap Fill: choose frequent useful vocabulary/);
  assert.match(materialService, /Discussion: ask direct personal\/opinion questions/);

  assert.match(materialService, /True\/False: include moderate inference/);
  assert.match(materialService, /Gap Fill: choose collocations, workplace\/professional vocabulary/);

  assert.match(materialService, /True\/False: test implicit ideas/);
  assert.match(materialService, /Gap Fill: choose advanced vocabulary, discourse markers/);
  assert.match(materialService, /Discussion: ask questions about implication/);
});

test("Listening prompt requires Key Vocabulary and Useful Expressions", () => {
  assert.match(materialService, /Add a Key Vocabulary section with 8-15 useful words/);
  assert.match(materialService, /Key Vocabulary format per item/);
  assert.match(materialService, /Add a Useful Expressions section with 3-8 natural spoken expressions/);
  assert.match(materialService, /Useful Expressions format per item/);
  assert.match(materialService, /Do not create a separate Idioms section yet/);
  assert.match(materialService, /Follow-up discussion questions should reuse transcript ideas, Key Vocabulary, and Useful Expressions/);
});

test("Listening mock examples are differentiated across B1, B2, and C1", () => {
  assert.match(mockGeneration, /buildListeningTrueFalseItems/);
  assert.match(mockGeneration, /buildListeningDiscussionItems/);
  assert.match(mockGeneration, /buildListeningKeyVocabulary/);
  assert.match(mockGeneration, /buildListeningUsefulExpressions/);
  assert.match(mockGeneration, /common problem/);
  assert.match(mockGeneration, /workplace pressure/);
  assert.match(mockGeneration, /implicit assumption/);
  assert.match(mockGeneration, /discourse marker/);
  assert.match(mockGeneration, /Key Vocabulary/);
  assert.match(mockGeneration, /Useful Expressions/);
});

test("Listening CEFR examples compare B1, B2, and C1 outputs for the same transcript", () => {
  assert.match(examples, /Same transcript excerpt/);
  assert.match(examples, /## B1 Output Direction/);
  assert.match(examples, /explicit comprehension/);
  assert.match(examples, /## B2 Output Direction/);
  assert.match(examples, /moderate inference/);
  assert.match(examples, /## C1 Output Direction/);
  assert.match(examples, /implicit ideas/);
});
