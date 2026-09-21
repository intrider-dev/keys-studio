import type { Note } from "./types";

export interface ScoreEvent {
  start: number;
  duration: number;
  pitches: number[];
  sources: number[];
  ties: number[];
}

/** MIDI quarter-note beats, quantized to sixteenths for a readable practice score. */
export function scoreBar(notes: Note[], bar: number, beatsPerBar: number, hand: "left" | "right"): ScoreEvent[] {
  const start = bar * beatsPerBar;
  const end = start + beatsPerBar;
  const candidates = notes.flatMap((note, index) => {
    if (note.hand !== hand) return [];
    const from = Math.round(note.start * 4) / 4;
    const to = Math.max(from + 0.25, Math.round((note.start + note.duration) * 4) / 4);
    return from < end && to > start ? [{ note, index, from, to }] : [];
  });
  const boundaries = [...new Set([start, end, ...candidates.flatMap(n => [Math.max(start, n.from), Math.min(end, n.to)])])].sort((a, b) => a - b);
  const result: ScoreEvent[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    let cursor = boundaries[i];
    const stop = boundaries[i + 1];
    const active = candidates.filter(n => n.from <= cursor && n.to > cursor);
    while (cursor < stop - 0.001) {
      const duration = [4, 2, 1, 0.5, 0.25, 0.125].find(d => d <= stop - cursor + 0.001 && Math.abs((cursor - start) / d - Math.round((cursor - start) / d)) < 0.001) ?? 0.125;
      result.push({ start: cursor, duration, pitches: [...new Set(active.map(n => n.note.pitch))].sort((a, b) => a - b), sources: active.map(n => n.index), ties: [...new Set(active.filter(n => n.from < cursor).map(n => n.note.pitch))] });
      cursor += duration;
    }
  }
  return result;
}

export function scoreKey(pitch: number): string {
  return `${["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"][pitch % 12]}/${Math.floor(pitch / 12) - 1}`;
}
