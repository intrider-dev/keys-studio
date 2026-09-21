import instrumentNames from "./features/practice/instrument-names.json";
export class PianoAudio {
  constructor() {
    this.context = null;
    this.buffers = new Map();
    this.active = new Set();
    this.encoded = null;
    this.program = -1;
    this.pending = null;
  }
  async init() {
    if (!this.context) this.context = new AudioContext();
    await this.context.resume();
  }
  async prepare(pitches, program = 0) {
    await this.init();
    if (this.requestedProgram !== program || !this.pending) {
      this.requestedProgram = program;
      this.pending = fetch("/instruments/" + instrumentNames[program] + ".json")
        .then(r => {
          if (r.status === 404 || r.headers?.get("content-type")?.includes("text/html")) return null;
          if (!r.ok) throw new Error("Не удалось загрузить тембр.");
          return r.json();
        }).then(encoded => ({ encoded, buffers: new Map(), decoding: new Map() }));
    }
    const request = this.pending;
    try {
      const bank = await request;
      if (request !== this.pending) return false;
      for (const p of new Set(pitches)) {
        if (bank.buffers.has(p) || bank.decoding.has(p)) continue;
        const name = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"][p % 12] + (Math.floor(p / 12) - 1);
        if (!bank.encoded) {
          const rate = 22050;
          const buffer = this.context.createBuffer(1, rate * 2, rate);
          const samples = buffer.getChannelData(0);
          const frequency = 440 * 2 ** ((p - 69) / 12);
          for (let i = 0; i < samples.length; i++) {
            const time = i / rate;
            const phase = 2 * Math.PI * frequency * time;
            samples[i] = (Math.sin(phase) + 0.2 * Math.sin(phase * 2)) * Math.min(1, time * 150) * Math.exp(-time * 2.5) * 0.7;
          }
          bank.buffers.set(p, buffer);
          continue;
        }
        const b64 = bank.encoded[name];
        if (!b64) continue;
        const bytes = Uint8Array.from(atob(b64.split(",").pop()), c => c.charCodeAt(0));
        bank.decoding.set(p, this.context.decodeAudioData(bytes.buffer).then(buffer => bank.buffers.set(p, buffer)));
      }
      await Promise.all(bank.decoding.values());
      if (request !== this.pending) return false;
      // Keep the previous sound available until the replacement bank is ready.
      // Already sounding notes retain their envelopes across the switch.
      this.buffers = bank.buffers;
      this.encoded = bank.encoded;
      this.program = program;
      return true;
    } catch (error) {
      if (request === this.pending) this.pending = null;
      throw error;
    }
  }

  play(pitch, duration = 0.4, velocity = 0.7) {
    if (!this.context || !this.buffers.has(pitch)) return;
    const source = this.context.createBufferSource();
    source.buffer = this.buffers.get(pitch);
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    gain.gain.setValueAtTime(velocity * 0.48, now);
    gain.gain.setValueAtTime(velocity * 0.48, now + duration);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.15);
    source.connect(gain).connect(this.context.destination);
    source.start();
    source.stop(now + duration + 0.18);
    this.active.add(source);
    source.onended = () => {
      this.active.delete(source);
      gain.disconnect();
    };
    return source;
  }
  click(accent = false) {
    if (!this.context) return;
    const o = this.context.createOscillator();
    const g = this.context.createGain();
    o.frequency.value = accent ? 1100 : 750;
    g.gain.setValueAtTime(0.045, this.context.currentTime);
    g.gain.exponentialRampToValueAtTime(
      0.0001,
      this.context.currentTime + 0.04,
    );
    o.connect(g).connect(this.context.destination);
    o.start();
    o.stop(this.context.currentTime + 0.05);
  }
  stop() {
    for (const s of this.active) {
      try {
        s.stop();
      } catch {}
    }
    this.active.clear();
  }
}
