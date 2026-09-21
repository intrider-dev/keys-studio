import test from "node:test";
import assert from "node:assert/strict";
import {
  previewKeys,
  keyPressure,
} from "../src/features/practice/key-motion.js";

test("demo keys follow chords, overlaps, durations and fragment boundaries", () => {
  const notes = [
    { pitch: 48, hand: "left", start: 0, duration: 2 },
    { pitch: 60, hand: "right", start: 0, duration: 1 },
    { pitch: 60, hand: "right", start: 0.75, duration: 1 },
    { pitch: 64, hand: "right", start: 2, duration: 1 },
  ];
  assert.equal(previewKeys(notes, -1).size, 0);
  assert.deepEqual([...previewKeys(notes, 0).keys()], [48, 60]);
  assert.deepEqual([...previewKeys(notes, 1).keys()], [48, 60]);
  assert.deepEqual([...previewKeys(notes, 1.75).keys()], [48]);
  assert.deepEqual([...previewKeys(notes, 2).keys()], [64]);
  assert.equal(previewKeys(notes, 2, 0, 2).size, 0);
  assert.equal(previewKeys(notes, 1, 1, 2).size, 0);
  assert.equal(notes[0].status, undefined);
});
test("key travel is smooth, frame-rate independent and returns fully to rest", () => {
  let a = 0,
    b = 0;
  for (let i = 0; i < 6; i++) a = keyPressure(a, true, 1 / 60);
  for (let i = 0; i < 12; i++) b = keyPressure(b, true, 1 / 120);
  assert.ok(Math.abs(a - b) < 1e-10);
  assert.ok(a > 0.9 && a < 1);
  for (let i = 0; i < 60; i++) a = keyPressure(a, false, 1 / 60);
  assert.equal(a, 0);
});
