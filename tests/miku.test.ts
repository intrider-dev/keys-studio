import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  mikuEmotion,
  MIKU_EMOTIONS,
} from "../src/features/practice/miku-emotion";
import { cleanSettings } from "../src/features/practice/library";
import {
  DEFAULT_SETTINGS,
  type Snapshot,
} from "../src/features/practice/types";

test("Miku reacts to judgments and respects a manually selected expression", () => {
  const state = {
    settings: DEFAULT_SETTINGS,
    running: false,
    waiting: false,
    recentFeedback: null,
    combo: 0,
  } as Snapshot;
  assert.equal(mikuEmotion(state), "neutral");
  assert.equal(mikuEmotion({ ...state, running: true }), "happy");
  assert.equal(
    mikuEmotion({ ...state, recentFeedback: { type: "wrong", beat: 1 } }),
    "surprised",
  );
  assert.equal(
    mikuEmotion({
      ...state,
      combo: 12,
      recentFeedback: { type: "perfect", beat: 1 },
    }),
    "wink",
  );
  assert.equal(
    mikuEmotion({
      ...state,
      settings: {
        ...DEFAULT_SETTINGS,
        visual: { ...DEFAULT_SETTINGS.visual, dancerEmotion: "sad" },
      },
    }),
    "sad",
  );
  assert.equal(cleanSettings({}, 1).visual.dancerEmotion, "auto");
});
test("Miku model has a humanoid skeleton and nine facial morphs", { skip: !existsSync("public/characters/miku.vrm") }, () => {
  const data = readFileSync("public/characters/miku.vrm");
  assert.equal(data.toString("ascii", 0, 4), "glTF");
  const model = JSON.parse(
    data.toString("utf8", 20, 20 + data.readUInt32LE(12)),
  );
  assert.ok(model.extensions.VRM.humanoid.humanBones.length > 20);
  for (const mesh of model.meshes)
    for (const primitive of mesh.primitives)
      assert.equal(primitive.targets.length, 9);
});
test("each emotion has a complete and distinct 48-frame sprite sheet", { skip: !existsSync("public/characters/miku-neutral.png") }, () => {
  const sheets = MIKU_EMOTIONS.map((name) =>
    readFileSync(`public/characters/miku-${name}.png`),
  );
  for (const sheet of sheets) {
    assert.equal(sheet.readUInt32BE(16), 192 * 8);
    assert.equal(sheet.readUInt32BE(20), 256 * 6);
  }
  for (let i = 1; i < sheets.length; i++)
    assert.notDeepEqual(sheets[0], sheets[i]);
});
