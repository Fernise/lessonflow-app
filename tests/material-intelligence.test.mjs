import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(new URL("../src/lib/material-intelligence.ts", import.meta.url), "utf8");

test("material intelligence uses safe array access for partial metadata", () => {
  assert.match(source, /safeStringArray\(metadata\?\.skills\)\[0\]/);
  assert.doesNotMatch(source, /metadata\?\.skills\[0\]/);
});
