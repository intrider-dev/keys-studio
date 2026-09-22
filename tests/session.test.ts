import test from "node:test";
import assert from "node:assert/strict";
import { PracticeSession } from "../src/features/practice/session";

function session() {
  const s = new PracticeSession();
  s.song = {
    name: "Study",
    bpm: 90,
    bars: 2,
    beatsPerBar: 4,
    signature: "4/4",
    notes: [{ pitch: 60, start: 0, duration: 1, hand: "right" }],
  };
  Object.assign(s, { mounted: true });
  s.reset();
  return s;
}

test("pausing during sound preparation cancels the pending start", async () => {
  const s = session();
  let ready!: () => void;
  s.audio.prepare = async () => {
    await new Promise<void>((r) => {
      ready = r;
    });
    s.audio.program = 0;
    return true;
  };
  const start = s.toggle();
  assert.equal(s.getSnapshot().loading, true);
  s.pause();
  ready();
  await start;
  assert.equal(s.getSnapshot().running, false);
  assert.equal(s.getSnapshot().loading, false);
});

test("restart preserves listening mode while stop returns to practice", async () => {
  const s = session();
  s.updateSettings({ sound: "off" });
  await s.demo();
  s.testing.setBeat(2);
  s.restart();
  assert.equal(s.getSnapshot().preview, true);
  assert.equal(s.getSnapshot().beat, -4);
  await s.toggle();
  assert.equal(s.getSnapshot().preview, true);
  assert.equal(s.getSnapshot().running, true);
  s.reset();
  assert.equal(s.getSnapshot().preview, false);
});

test("empty hand cannot start a session with no playable notes", async () => {
  const s = session();
  s.updateSettings({ sound: "off", hand: "left" });
  await s.toggle();
  assert.equal(s.getSnapshot().running, false);
  assert.match(s.getSnapshot().notice, /нет нот/);
});

test("tempo and instrument changes preserve position, score and active playback", async () => {
  const s = session();
  s.updateSettings({ sound: "off" });
  await s.toggle();
  s.testing.setBeat(0);
  s.press(60, "test");
  const before = s.getSnapshot();
  s.updateSettings({ bpm: 140, instrument: 40 });
  const after = s.getSnapshot();
  assert.equal(after.running, true);
  assert.equal(after.beat, before.beat);
  assert.equal(after.score, before.score);
  assert.equal(s.engine.options.bpm, 140);
});

test("releasing a key during sample loading does not play it later", async () => {
  const s = session();
  let ready!: () => void;
  let played = 0;
  s.audio.prepare = async () => {
    await new Promise<void>((r) => {
      ready = r;
    });
    return true;
  };
  s.audio.play = () => {
    played++;
  };
  s.press(60, "KeyA");
  s.release("KeyA");
  ready();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(played, 0);
});

test("dismissed device errors stay hidden across snapshot updates", () => {
  const s = session();
  Object.assign(s, {
    device: {
      connected: false,
      output: false,
      error: "Disconnected",
      received: 0,
      name: null,
    },
  });
  s.publish();
  assert.equal(s.getSnapshot().notice, "Disconnected");
  s.dismissNotice();
  s.publish();
  assert.equal(s.getSnapshot().notice, "");
});
