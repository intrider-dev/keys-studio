export const noteName = (p) =>
  [
    "До",
    "До♯",
    "Ре",
    "Ре♯",
    "Ми",
    "Фа",
    "Фа♯",
    "Соль",
    "Соль♯",
    "Ля",
    "Ля♯",
    "Си",
  ][p % 12] +
  (Math.floor(p / 12) - 1);

export class Trainer {
  constructor(notes = [], options = {}) {
    this.source = notes;
    this.options = {
      bpm: 90,
      mode: "practice",
      hand: "right",
      window: 180,
      latency: 0,
      hold: true,
      start: 0,
      end: Infinity,
      ...options,
    };
    this.reset();
  }
  reset() {
    this.notes = this.source
      .filter(
        (n) =>
          n.start >= this.options.start - 1e-6 &&
          n.start < this.options.end &&
          (this.options.hand === "both" || n.hand === this.options.hand),
      )
      .map((n, i) => ({ ...n, id: i, status: "pending" }));
    this.beat = this.options.start - 4;
    this.running = false;
    this.finished = false;
    this.waiting = false;
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.hits = 0;
    this.misses = 0;
    this.wrong = 0;
    this.short = 0;
    this.quality = 0;
    this.held = new Map();
    this.feedback = [];
    this.events = [];
    this.end = Math.min(
      this.options.end,
      Math.max(
        this.options.start + 1,
        ...this.source.map((n) => n.start + n.duration),
      ),
    );
  }
  emit(type, pitch, details = {}) {
    const e = { type, pitch, beat: this.beat, ...details };
    this.feedback.unshift(e);
    this.feedback.length = Math.min(this.feedback.length, 7);
    this.events.push(e);
    return e;
  }
  get accuracy() {
    const count = this.hits + this.misses + this.wrong;
    return count
      ? Math.max(
          0,
          Math.round(((this.quality - this.short * 0.2) / count) * 100),
        )
      : null;
  }
  tick(seconds) {
    if (!this.running || this.finished) return;
    let next = this.beat + (Math.max(0, seconds) * this.options.bpm) / 60;
    this.waiting = false;
    if (this.options.mode === "practice") {
      const pending = this.notes.find((n) => n.status === "pending");
      if (pending && next >= pending.start) {
        next = pending.start;
        this.waiting = true;
      }
    }
    this.beat = next;
    if (this.options.mode === "game")
      for (const n of this.notes) {
        if (
          n.status === "pending" &&
          ((this.beat - n.start) * 60000) / this.options.bpm >
            this.options.window
        ) {
          n.status = "miss";
          this.misses++;
          this.combo = 0;
          this.emit("miss", n.pitch, { note: n });
        }
      }
    if (this.beat >= this.end + 0.4) {
      this.finished = true;
      this.running = false;
      this.emit("finish");
    }
  }
  press(pitch) {
    if (this.held.has(pitch)) return null;
    this.held.set(pitch, null);
    if (
      !this.running ||
      this.beat < this.options.start - 0.001 ||
      this.options.mode === "demo"
    )
      return null;
    const adjusted =
      this.beat - (this.options.latency * this.options.bpm) / 60000;
    const candidates = this.notes.filter(
      (n) => n.status === "pending" && n.pitch === pitch,
    );
    const n = candidates.sort(
      (a, b) => Math.abs(a.start - adjusted) - Math.abs(b.start - adjusted),
    )[0];
    const delta = n
      ? ((adjusted - n.start) * 60000) / this.options.bpm
      : Infinity;
    if (n && Math.abs(delta) <= this.options.window) {
      const type =
        this.options.mode === "practice"
          ? "correct"
          : Math.abs(delta) <= 60
            ? "perfect"
            : Math.abs(delta) <= 120
              ? "good"
              : delta < 0
                ? "early"
                : "late";
      const weight = {
        correct: 1,
        perfect: 1,
        good: 0.85,
        early: 0.6,
        late: 0.6,
      }[type];
      n.status = "hit";
      this.hits++;
      this.quality += weight;
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      const multiplier = 1 + Math.min(3, Math.floor((this.combo - 1) / 10));
      const points = Math.round(1000 * weight) * multiplier;
      this.score += points;
      this.held.set(pitch, n);
      return this.emit(type, pitch, { delta, points, note: n });
    }
    this.wrong++;
    this.combo = 0;
    this.score = Math.max(0, this.score - 100);
    return this.emit(
      n && delta < 0 && delta > -1500 ? "tooEarly" : "wrong",
      pitch,
    );
  }
  release(pitch) {
    const n = this.held.get(pitch);
    this.held.delete(pitch);
    if (
      n &&
      this.running &&
      this.options.mode === "game" &&
      this.options.hold &&
      n.duration >= 0.5
    ) {
      const remaining =
        ((n.start + n.duration - this.beat) * 60000) / this.options.bpm;
      if (
        remaining >
        Math.max(180, ((n.duration * 60000) / this.options.bpm) * 0.35)
      ) {
        this.short++;
        this.combo = 0;
        this.score = Math.max(0, this.score - 150);
        this.emit("short", pitch, { note: n });
      }
    }
  }
  pause() {
    this.running = false;
    this.held.clear();
  }
}
