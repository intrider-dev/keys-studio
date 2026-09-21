import type { RecordResult, Settings, Song } from "./types";
export const emptyRecord: RecordResult = { score: 0, combo: 0, accuracy: null };
function key(song: Song, settings: Settings) {
  return (
    "piano-record:" +
    JSON.stringify([
      song.name,
      song.notes.length,
      settings.hand,
      settings.mode,
      settings.bpm,
      String(settings.window),
      settings.hold,
      String(settings.firstBar),
      String(settings.lastBar),
    ])
  );
}
export function readRecord(song: Song, settings: Settings): RecordResult {
  try {
    return {
      ...emptyRecord,
      ...JSON.parse(localStorage.getItem(key(song, settings)) ?? "{}"),
    };
  } catch {
    return { ...emptyRecord };
  }
}
export function saveRecord(
  song: Song,
  settings: Settings,
  result: RecordResult,
) {
  const previous = readRecord(song, settings);
  const record = {
    score: Math.max(previous.score, result.score),
    combo: Math.max(previous.combo, result.combo),
    accuracy: Math.max(previous.accuracy ?? 0, result.accuracy ?? 0),
  };
  try {
    localStorage.setItem(key(song, settings), JSON.stringify(record));
  } catch {
    /* Storage can be disabled. */
  }
  return record;
}
