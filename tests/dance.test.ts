import test from "node:test";
import assert from "node:assert/strict";
import { dancePose, clampPosition } from "../src/features/practice/dance";
import { cleanSettings, parseBundle } from "../src/features/practice/library";
import { DEFAULT_SETTINGS } from "../src/features/practice/types";

test("dance stays on the transport beat, repeats on bar boundaries and supports count-in", () => {
  for (const beat of [-4, -0.5, 0, 0.25, 0.5, 1.75, 3])
    assert.deepEqual(dancePose(beat), dancePose(beat + 400));
  assert.equal(dancePose(0).bounce, 0);
  assert.equal(dancePose(0.5).bounce, 0.24);
});
test("old songs leave the beta dancer off and constrain imported placement", () => {
  const old = cleanSettings({}, 8);
  assert.equal(old.visual.dancer, false);
  assert.equal(old.visual.dancerMode, "2d");
  const restored = cleanSettings(
    {
      visual: {
        ...DEFAULT_SETTINGS.visual,
        dancer: true,
        dancerX: 99,
        dancerY: -50,
      },
    },
    8,
  );
  assert.equal(restored.visual.dancerX, 1);
  assert.equal(restored.visual.dancerY, 0);
  assert.equal(clampPosition(-2), 0);
  assert.equal(clampPosition(2), 1);
});
test("shared songs preserve dancer mode and position", () => {
  const settings = {
    ...DEFAULT_SETTINGS,
    visual: {
      ...DEFAULT_SETTINGS.visual,
      dancer: true,
      dancerMode: "3d",
      dancerX: 0.4,
      dancerY: 0.65,
    },
  };
  const entry = parseBundle(
    JSON.stringify({
      format: "piano-practice",
      version: 1,
      settings,
      song: {
        name: "Dance",
        bpm: 120,
        beatsPerBar: 4,
        signature: "4/4",
        notes: [{ pitch: 60, start: 0, duration: 1, hand: "right" }],
      },
    }),
  );
  assert.equal(entry.settings.visual.dancer, true);
  assert.equal(entry.settings.visual.dancerMode, "3d");
  assert.equal(entry.settings.visual.dancerX, 0.4);
  assert.equal(entry.settings.visual.dancerY, 0.65);
});
