/** Visual notes only: never send synthetic presses to the scoring engine. */
export function previewKeys(notes, beat, start = 0, end = Infinity) {
  const active = new Map();
  for (const note of notes) {
    if (
      note.start >= start &&
      note.start < end &&
      note.start <= beat &&
      beat < Math.min(end, note.start + note.duration)
    ) {
      active.set(note.pitch, note.hand);
    }
  }
  return active;
}

export function keyPressure(previous, pressed, seconds) {
  const target = pressed ? 1 : 0;
  const next =
    previous +
    (target - previous) *
      (1 - Math.exp(-Math.min(seconds, 0.1) * (pressed ? 38 : 22)));
  return Math.abs(target - next) < 0.001 ? target : next;
}
