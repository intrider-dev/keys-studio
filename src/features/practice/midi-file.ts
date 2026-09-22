import * as MidiPackage from "@tonejs/midi";
export const Midi =
  MidiPackage.Midi ??
  (MidiPackage as unknown as { default: typeof MidiPackage }).default.Midi;
import type { Note, Song } from "./types";

export function parseMidi(buffer: ArrayBuffer, name: string): Song {
  let midi;
  try {
    if (new TextDecoder().decode(buffer.slice(0, 4)) !== "MThd")
      throw new Error();
    midi = new Midi(buffer);
  } catch {
    throw new Error(
      "Не удалось прочитать MIDI. Файл повреждён или имеет другой формат.",
    );
  }
  const notes: Note[] = [];
  let outOfRange = 0;
  for (const track of midi.tracks.filter((t) => !t.instrument.percussion)) {
    const hand = /left|левая|левой/i.test(track.name)
      ? "left"
      : /right|правая|правой/i.test(track.name)
        ? "right"
        : null;
    for (const note of track.notes) {
      if (notes.length >= 50000)
        throw new Error(
          "В MIDI слишком много нот. Разделите произведение на фрагменты до 50 000 нот.",
        );
      if (
        !Number.isFinite(note.ticks) ||
        note.ticks < 0 ||
        !Number.isFinite(note.durationTicks) ||
        note.durationTicks <= 0
      )
        continue;
      if (note.midi < 36 || note.midi > 96) outOfRange++;
      notes.push({
        pitch: note.midi,
        start: note.ticks / midi.header.ppq,
        duration: note.durationTicks / midi.header.ppq,
        velocity: note.velocity,
        hand: hand ?? (note.midi < 60 ? "left" : "right"),
      });
    }
  }
  if (!notes.length)
    throw new Error(
      "В этом MIDI нет нот для фортепиано. Выберите другой файл.",
    );
  for (const note of notes) {
    while (note.pitch < 36) note.pitch += 12;
    while (note.pitch > 96) note.pitch -= 12;
  }
  notes.sort((a, b) => a.start - b.start || a.pitch - b.pitch);
  const unique = notes.filter(
    (note, i) =>
      i === 0 ||
      Math.abs(note.start - notes[i - 1].start) > 0.0001 ||
      note.pitch !== notes[i - 1].pitch,
  );
  const signature = midi.header.timeSignatures[0]?.timeSignature ?? [4, 4];
  const beatsPerBar = (signature[0] * 4) / signature[1];
  if (!Number.isFinite(beatsPerBar) || beatsPerBar <= 0 || beatsPerBar > 32)
    throw new Error("Некорректный музыкальный размер.");
  return {
    name,
    adaptation: outOfRange
      ? `${outOfRange} нот перенесено на октавы в диапазон C2-C7 для 61 клавиши.`
      : undefined,
    notes: unique,
    bpm: Math.round(midi.header.tempos[0]?.bpm ?? 120),
    beatsPerBar,
    bars: Math.ceil(
      Math.max(...unique.map((n) => n.start + n.duration)) / beatsPerBar,
    ),
    signature: signature.join("/"),
  };
}
