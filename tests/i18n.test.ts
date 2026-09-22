import test from "node:test";
import assert from "node:assert/strict";
import { getLocale, setLocale, t } from "../src/lib/i18n";
import { noteName } from "../src/engine.js";
import { number } from "../src/features/practice/format";

test("switching locale translates labels, dynamic messages, notes and numbers", () => {
  setLocale("en");
  assert.equal(getLocale(), "en");
  assert.equal(t("Прослушивание"), "Listening");
  assert.equal(t("MIDI активен · 12 нажатий"), "MIDI active · 12 key presses");
  assert.equal(t(" · +28 мс"), " · +28 ms");
  assert.equal(noteName(61), "C♯4");
  assert.equal(number.format(1234), "1,234");
  assert.equal(t("My own song.mid"), "My own song.mid");
  assert.equal(t(42), 42);
  setLocale("ru");
  assert.equal(t("Прослушивание"), "Прослушивание");
  assert.equal(noteName(61), "До♯4");
});
