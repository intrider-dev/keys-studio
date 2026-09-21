import test from "node:test";
import assert from "node:assert/strict";
import { PianoAudio } from "../src/audio.js";

test("instrument banks swap only when ready; stale loads cannot replace the latest selection", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<(value: unknown) => void> = [];
  globalThis.fetch = (() => new Promise(resolve => requests.push(resolve))) as typeof fetch;
  try {
    const audio = new PianoAudio();
    const previous = new Map([[60, { previous: true }]]);
    audio.buffers = previous;
    audio.program = 0;
    audio.context = { resume: async () => {}, decodeAudioData: async () => ({ decoded: true }) };
    let stops = 0;
    audio.stop = () => { stops++; };
    const violin = audio.prepare([60], 40);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(audio.buffers, previous);
    const cello = audio.prepare([60], 42);
    await new Promise(resolve => setImmediate(resolve));
    requests[1]({ ok: true, json: async () => ({ C4: "data:audio/mp3;base64,YQ==" }) });
    assert.equal(await cello, true);
    requests[0]({ ok: true, json: async () => ({ C4: "data:audio/mp3;base64,Yg==" }) });
    assert.equal(await violin, false);
    assert.equal(audio.program, 42);
    assert.equal(audio.buffers.has(60), true);
    assert.equal(stops, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
