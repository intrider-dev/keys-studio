import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { parseBundle, cleanSettings } from "../src/features/practice/library";
import { parseMidi } from "../src/features/practice/midi-file";
import { DEFAULT_SETTINGS } from "../src/features/practice/types";

const song = {
  name: "Practice",
  bpm: 120,
  beatsPerBar: 4,
  bars: 1,
  signature: "4/4",
  notes: [{ pitch: 60, start: 0, duration: 1, hand: "right" }],
};
test("portable song preserves instrument, appearance and playable notes", () => {
  const settings = {
    ...DEFAULT_SETTINGS,
    instrument: 40,
    visual: {
      ...DEFAULT_SETTINGS.visual,
      view: "sheet",
      sheetColumns: 3,
      sheetRows: 4,
      right: "#ff9922",
      image: "data:image/png;base64,YQ==",
      background: "image",
    },
  };
  const result = parseBundle(
    JSON.stringify({ format: "piano-practice", version: 1, song, settings }),
  );
  assert.equal(result.settings.instrument, 40);
  assert.equal(result.settings.visual.image, settings.visual.image);
  assert.equal(result.settings.visual.view, "sheet");
  assert.equal(result.settings.visual.sheetColumns, 3);
  assert.equal(result.settings.visual.sheetRows, 4);
  assert.equal(result.song.notes[0].pitch, 60);
});
test("invalid packages and unplayable notes are rejected", () => {
  for (const patch of [
    { format: "other" },
    { version: 2 },
    { song: { ...song, notes: [] } },
    {
      song: {
        ...song,
        notes: [{ pitch: 999, start: 0, duration: 1, hand: "right" }],
      },
    },
    {
      song: {
        ...song,
        notes: [{ pitch: 60, start: -1, duration: 1, hand: "right" }],
      },
    },
  ])
    assert.throws(() =>
      parseBundle(
        JSON.stringify({
          format: "piano-practice",
          version: 1,
          song,
          ...patch,
        }),
      ),
    );
});
test("damaged packages and impossible time signatures report readable errors", () => {
  assert.throws(() => parseBundle("{"), /повреждён/);
  assert.throws(() => parseBundle("null"), /Неизвестный формат/);
  for (const signature of ["4/0", "0/4", "4/3", "6/8"]) {
    assert.throws(
      () =>
        parseBundle(
          JSON.stringify({
            format: "piano-practice",
            version: 1,
            song: { ...song, signature },
          }),
        ),
      /музыкальный размер/,
    );
  }
  assert.throws(
    () =>
      parseMidi(
        new TextEncoder().encode("<html>not midi</html>").buffer,
        "file",
      ),
    /Не удалось прочитать MIDI/,
  );
});
test("imported settings cannot introduce remote images or invalid ranges", () => {
  const settings = cleanSettings(
    {
      bpm: Infinity,
      instrument: 999,
      firstBar: 99,
      lastBar: -1,
      visual: {
        ...DEFAULT_SETTINGS.visual,
        image: "javascript:alert(1)",
        right: "red;display:none",
      },
    },
    4,
  );
  assert.equal(settings.bpm, 90);
  assert.equal(settings.instrument, 127);
  assert.equal(settings.firstBar, 4);
  assert.equal(settings.lastBar, 4);
  assert.equal(settings.visual.image, "");
  assert.equal(settings.visual.right, DEFAULT_SETTINGS.visual.right);
});
test("every downloaded piece parses into the Yamaha keyboard range", () => {
  for (const file of readdirSync("public/songs").filter((f) =>
    f.endsWith(".mid"),
  )) {
    const bytes = readFileSync("public/songs/" + file);
    const parsed = parseMidi(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      file,
    );
    assert.ok(parsed.notes.length > 20);
    assert.ok(parsed.notes.every((n) => n.pitch >= 36 && n.pitch <= 96));
    assert.ok(Number.isFinite(parsed.bars));
  }
});
test(
  "all 128 local instruments contain decodable audio data",
  { skip: !existsSync("public/instruments") },
  () => {
    const files = readdirSync("public/instruments");
    assert.equal(files.length, 128);
    for (const file of files) {
      const samples = JSON.parse(
        readFileSync("public/instruments/" + file, "utf8"),
      );
      assert.match(samples.C4, /^data:audio\/mp3;base64,/);
      assert.ok(Buffer.from(samples.C4.split(",")[1], "base64").length > 100);
    }
  },
);
